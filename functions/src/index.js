const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2/options');
const { INCIDENT_STATUS, USER_STATUS } = require('./lib/constants');
const { rankHospitalsByEta } = require('./lib/distanceMatrix');
const { acceptIncidentTransaction, assignHospitalForReview, createDispatchQueue, notifyHospital, simulateMovement } = require('./lib/dispatch');
const { haversineDistanceKm } = require('./lib/geo');
const { analyzeEmergencyAudio } = require('./lib/triage');

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({
  region: 'asia-south1',
  memory: '512MiB',
  timeoutSeconds: 120,
});

const db = admin.firestore();

async function fetchCandidateHospitals(location) {
  const snapshot = await db.collection('hospitals').where('is_available', '==', true).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((hospital) => haversineDistanceKm(location, hospital.location) <= 10)
    .sort(
      (left, right) =>
        haversineDistanceKm(location, left.location) - haversineDistanceKm(location, right.location),
    )
    .slice(0, 5);
}

async function dispatchToHospital({ incidentId, hospital, triage, etaMinutes }) {
  await assignHospitalForReview(db, incidentId, hospital);
  return notifyHospital({ hospital, incidentId, triage, etaMinutes });
}

exports.handleIncidentCreated = onDocumentCreated('incidents/{incidentId}', async (event) => {
  const incidentId = event.params.incidentId;
  const snapshot = event.data;

  if (!snapshot?.exists) {
    return;
  }

  const incident = snapshot.data();

  try {
    await snapshot.ref.set(
      {
        incident_id: incidentId,
        status: INCIDENT_STATUS.ANALYZING,
      },
      { merge: true },
    );

    await db.collection('users').doc(incident.user_id).set(
      {
        status: USER_STATUS.IN_CRISIS,
      },
      { merge: true },
    );

    const triage = await analyzeEmergencyAudio(incident.audio_url);
    await snapshot.ref.set(
      {
        triage,
        status: INCIDENT_STATUS.SEARCHING,
      },
      { merge: true },
    );

    const nearbyHospitals = await fetchCandidateHospitals(incident.location);
    const rankedHospitals = await rankHospitalsByEta(incident.location, nearbyHospitals);

    if (rankedHospitals.length === 0) {
      await snapshot.ref.set(
        {
          notification_sent: false,
          acknowledged: false,
          triage: {
            ...triage,
            summary: `${triage.summary} No available hospital found within 10 km.`,
          },
        },
        { merge: true },
      );
      return;
    }

    await createDispatchQueue(db, incidentId, rankedHospitals);
    const firstHospital = rankedHospitals[0];
    await dispatchToHospital({
      incidentId,
      hospital: firstHospital,
      triage,
      etaMinutes: firstHospital.etaMinutes,
    });
  } catch (error) {
    console.error(`Incident orchestration failed for ${incidentId}:`, error);
    await snapshot.ref.set(
      {
        status: INCIDENT_STATUS.SEARCHING,
        triage: {
          type: 'unknown',
          severity: 'medium',
          summary: 'Fallback triage activated after orchestration error.',
        },
        notification_sent: false,
        acknowledged: false,
      },
      { merge: true },
    );
  }
});

exports.processDispatchQueue = onDocumentCreated('dispatch_queue/{incidentId}', async (event) => {
  const queueRef = event.data?.ref;
  const queue = event.data?.data();

  if (!queueRef || !queue || !Array.isArray(queue.candidates)) {
    return;
  }

  for (let nextIndex = 1; nextIndex < queue.candidates.length; nextIndex += 1) {
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const [incidentSnap, queueSnap] = await Promise.all([
      db.collection('incidents').doc(queue.incident_id).get(),
      queueRef.get(),
    ]);

    if (!incidentSnap.exists || !queueSnap.exists) {
      await queueRef.set({ completed: true }, { merge: true });
      return;
    }

    const incident = incidentSnap.data();
    const latestQueue = queueSnap.data();

    if (
      latestQueue?.completed === true ||
      incident.acknowledged === true ||
      [INCIDENT_STATUS.ACCEPTED, INCIDENT_STATUS.IN_TRANSIT, INCIDENT_STATUS.RESOLVED].includes(
        incident.status,
      )
    ) {
      await queueRef.set({ completed: true }, { merge: true });
      return;
    }

    const nextCandidate = latestQueue?.candidates?.[nextIndex];
    if (!nextCandidate?.hospital_id) {
      continue;
    }

    const hospitalSnap = await db.collection('hospitals').doc(nextCandidate.hospital_id).get();
    if (!hospitalSnap.exists) {
      continue;
    }

    await dispatchToHospital({
      incidentId: queue.incident_id,
      hospital: hospitalSnap.data(),
      triage: incident.triage || {
        type: 'unknown',
        severity: 'medium',
        summary: 'Manual review required.',
      },
      etaMinutes: Number(nextCandidate.eta_minutes || 0),
    });

    await queueRef.set(
      {
        current_index: nextIndex,
        next_retry_at: admin.firestore.Timestamp.fromMillis(Date.now() + 15000),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await queueRef.set({ completed: true }, { merge: true });
});

exports.acceptIncident = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  if (request.auth.token.role !== 'hospital' || !request.auth.token.hospitalId) {
    throw new HttpsError('permission-denied', 'Hospital credentials are required.');
  }

  const incidentId = request.data?.incidentId;
  if (typeof incidentId !== 'string' || incidentId.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'A valid incidentId is required.');
  }

  try {
    const result = await acceptIncidentTransaction({
      db,
      incidentId: incidentId.trim(),
      hospitalId: request.auth.token.hospitalId,
    });
    await db.collection('simulation_jobs').add(
      {
        ambulance_id: result.ambulanceId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      },
    );

    return {
      ok: true,
      ambulanceId: result.ambulanceId,
    };
  } catch (error) {
    console.error('Incident acceptance failed:', error);
    throw new HttpsError('failed-precondition', error.message);
  }
});

exports.processSimulationJob = onDocumentCreated('simulation_jobs/{jobId}', async (event) => {
  const ambulanceId = event.data?.data()?.ambulance_id;

  if (typeof ambulanceId !== 'string' || ambulanceId.trim().length === 0) {
    await event.data?.ref.set(
      {
        completed: false,
        error: 'Missing ambulance_id',
      },
      { merge: true },
    );
    return;
  }

  try {
    await simulateMovement({ db, ambulanceId: ambulanceId.trim() });
    await event.data?.ref.set({ completed: true }, { merge: true });
  } catch (error) {
    console.error(`Ambulance simulation failed for ${ambulanceId}:`, error);
    await event.data?.ref.set(
      {
        completed: false,
        error: error.message,
      },
      { merge: true },
    );
  }
});

exports.simulateMovement = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const ambulanceId = request.data?.ambulanceId;
  if (typeof ambulanceId !== 'string' || ambulanceId.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'A valid ambulanceId is required.');
  }

  try {
    await simulateMovement({ db, ambulanceId: ambulanceId.trim() });
    return { ok: true };
  } catch (error) {
    console.error('Manual ambulance simulation failed:', error);
    throw new HttpsError('internal', error.message);
  }
});
