const admin = require('firebase-admin');
const { AMBULANCE_STATUS, INCIDENT_STATUS } = require('./constants');
const { haversineDistanceKm, orderByDistance } = require('./geo');
const { isLikelyFcmToken } = require('./validators');

async function notifyHospital({ hospital, incidentId, triage, etaMinutes }) {
  if (!isLikelyFcmToken(hospital.fcm_token)) {
    console.warn(`Skipping invalid FCM token for hospital ${hospital.hospital_id}`);
    return { delivered: false, reason: 'invalid-token' };
  }

  const payload = {
    token: hospital.fcm_token,
    notification: {
      title: `Emergency dispatch: ${triage.severity}`,
      body: triage.summary,
    },
    data: {
      incidentId,
      hospitalId: hospital.hospital_id,
      severity: triage.severity,
      type: triage.type,
      etaMinutes: String(etaMinutes),
    },
    android: {
      priority: 'high',
    },
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await admin.messaging().send(payload);
      return { delivered: true, messageId: response };
    } catch (error) {
      console.error(`FCM dispatch failed on attempt ${attempt}:`, error);
      if (attempt === 2) {
        return { delivered: false, reason: error.message };
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function createDispatchQueue(db, incidentId, hospitals) {
  const queueRef = db.collection('dispatch_queue').doc(incidentId);
  await queueRef.set(
    {
      incident_id: incidentId,
      candidates: hospitals.map((hospital) => ({
        hospital_id: hospital.hospital_id,
        eta_minutes: hospital.etaMinutes,
      })),
      current_index: 0,
      next_retry_at: admin.firestore.Timestamp.fromMillis(Date.now() + 15000),
      completed: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function assignHospitalForReview(db, incidentId, hospital) {
  await db.collection('incidents').doc(incidentId).set(
    {
      hospital_id: hospital.hospital_id,
      notification_sent: true,
      acknowledged: false,
      status: INCIDENT_STATUS.SEARCHING,
    },
    { merge: true },
  );
}

async function pickNearestIdleAmbulance(transaction, db, hospitalId, incidentLocation) {
  const ambulancesQuery = db
    .collection('ambulances')
    .where('hospital_id', '==', hospitalId)
    .where('status', '==', AMBULANCE_STATUS.IDLE);

  const ambulanceSnapshot = await transaction.get(ambulancesQuery);
  if (ambulanceSnapshot.empty) {
    throw new Error('No idle ambulance available for this hospital.');
  }

  const ranked = orderByDistance(
    incidentLocation,
    ambulanceSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
    (ambulance) => ambulance.current_location,
  );

  return ranked[0].record;
}

async function acceptIncidentTransaction({ db, incidentId, hospitalId }) {
  return db.runTransaction(async (transaction) => {
    const incidentRef = db.collection('incidents').doc(incidentId);
    const hospitalRef = db.collection('hospitals').doc(hospitalId);
    const queueRef = db.collection('dispatch_queue').doc(incidentId);

    const [incidentSnap, hospitalSnap, queueSnap] = await Promise.all([
      transaction.get(incidentRef),
      transaction.get(hospitalRef),
      transaction.get(queueRef),
    ]);

    if (!incidentSnap.exists) {
      throw new Error('Incident not found.');
    }

    if (!hospitalSnap.exists) {
      throw new Error('Hospital not found.');
    }

    const incident = incidentSnap.data();
    if (incident.status !== INCIDENT_STATUS.SEARCHING) {
      throw new Error(`Incident is not available for acceptance. Current status: ${incident.status}`);
    }

    if (incident.hospital_id !== hospitalId) {
      throw new Error('Incident is not assigned to this hospital.');
    }

    const ambulance = await pickNearestIdleAmbulance(
      transaction,
      db,
      hospitalId,
      incident.location,
    );
    const ambulanceRef = db.collection('ambulances').doc(ambulance.ambulance_id);

    transaction.update(incidentRef, {
      status: INCIDENT_STATUS.ACCEPTED,
      acknowledged: true,
      ambulance_id: ambulance.ambulance_id,
      hospital_id: hospitalId,
    });

    transaction.update(ambulanceRef, {
      status: AMBULANCE_STATUS.ASSIGNED,
      incident_id: incidentId,
    });

    transaction.update(hospitalRef, {
      active_ambulances: admin.firestore.FieldValue.increment(1),
    });

    if (queueSnap.exists) {
      transaction.update(queueRef, {
        completed: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      ambulanceId: ambulance.ambulance_id,
      ambulanceLocation: ambulance.current_location,
      incidentLocation: incident.location,
      incidentUserId: incident.user_id,
      hospitalId,
    };
  });
}

function moveTowardTarget(current, target, fraction) {
  return {
    latitude: current.latitude + (target.latitude - current.latitude) * fraction,
    longitude: current.longitude + (target.longitude - current.longitude) * fraction,
  };
}

async function simulateMovement({ db, ambulanceId }) {
  const ambulanceRef = db.collection('ambulances').doc(ambulanceId);
  const ambulanceSnap = await ambulanceRef.get();

  if (!ambulanceSnap.exists) {
    throw new Error('Ambulance not found.');
  }

  const ambulance = ambulanceSnap.data();
  if (!ambulance.incident_id) {
    throw new Error('Ambulance has no assigned incident.');
  }

  const incidentRef = db.collection('incidents').doc(ambulance.incident_id);
  const incidentSnap = await incidentRef.get();
  if (!incidentSnap.exists) {
    throw new Error('Assigned incident not found.');
  }

  const incident = incidentSnap.data();
  const target = incident.location;
  let current = ambulance.current_location;

  await incidentRef.set({ status: INCIDENT_STATUS.IN_TRANSIT }, { merge: true });

  for (let step = 0; step < 20; step += 1) {
    const remainingKm = haversineDistanceKm(current, target);
    if (remainingKm <= 0.08) {
      break;
    }

    current = moveTowardTarget(current, target, 0.35);

    await ambulanceRef.set(
      {
        current_location: new admin.firestore.GeoPoint(current.latitude, current.longitude),
      },
      { merge: true },
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const batch = db.batch();
  batch.set(
    ambulanceRef,
    {
      current_location: target,
      status: AMBULANCE_STATUS.IDLE,
      incident_id: null,
    },
    { merge: true },
  );
  batch.set(
    incidentRef,
    {
      status: INCIDENT_STATUS.RESOLVED,
    },
    { merge: true },
  );
  batch.set(
    db.collection('users').doc(incident.user_id),
    {
      status: 'safe',
    },
    { merge: true },
  );
  batch.set(
    db.collection('hospitals').doc(incident.hospital_id),
    {
      active_ambulances: admin.firestore.FieldValue.increment(-1),
    },
    { merge: true },
  );
  await batch.commit();
}

module.exports = {
  acceptIncidentTransaction,
  assignHospitalForReview,
  createDispatchQueue,
  notifyHospital,
  simulateMovement,
};
