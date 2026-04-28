const STORAGE_KEY = 'crisis-orchestrator-demo-state-v1';

const listeners = new Set();
let activeTimers = [];

function createTimestamp(offsetMinutes = 0) {
  return Date.now() - offsetMinutes * 60 * 1000;
}

function geoPoint(latitude, longitude) {
  return { latitude, longitude };
}

function createInitialState() {
  return {
    session: null,
    users: {
      'guest-demo-001': {
        uid: 'guest-demo-001',
        name: 'Ananya Rao',
        blood_group: 'B+',
        medical_history: 'Asthma, inhaler carried in handbag.',
        emergency_contacts: ['+91 98765 43210'],
        role: 'user',
        fcm_token: 'demo_fcm_guest_001',
        status: 'in_crisis',
      },
      'guest-demo-002': {
        uid: 'guest-demo-002',
        name: 'Rahul Mehta',
        blood_group: 'O-',
        medical_history: 'No known chronic conditions.',
        emergency_contacts: ['+91 99887 76655'],
        role: 'user',
        fcm_token: 'demo_fcm_guest_002',
        status: 'in_crisis',
      },
      'guest-demo-003': {
        uid: 'guest-demo-003',
        name: 'Sara Thomas',
        blood_group: 'A+',
        medical_history: 'Hypertension, on daily medication.',
        emergency_contacts: ['+91 90909 21212'],
        role: 'user',
        fcm_token: 'demo_fcm_guest_003',
        status: 'safe',
      },
      'staff-demo-001': {
        uid: 'staff-demo-001',
        name: 'Hotel Duty Manager',
        blood_group: 'O+',
        medical_history: 'Not applicable',
        emergency_contacts: [],
        role: 'staff',
        fcm_token: 'demo_fcm_staff_001',
        status: 'safe',
      },
      'hospital-demo-001': {
        uid: 'hospital-demo-001',
        name: 'Apollo Dispatch Desk',
        blood_group: 'N/A',
        medical_history: 'Not applicable',
        emergency_contacts: [],
        role: 'hospital',
        fcm_token: 'demo_fcm_hospital_001',
        status: 'safe',
      },
    },
    incidents: [
      {
        id: 'incident-demo-001',
        incident_id: 'incident-demo-001',
        user_id: 'guest-demo-001',
        location: geoPoint(12.97194, 77.59411),
        floor_info: 'Room 804, Tower A',
        audio_url: 'gs://demo-bucket/audio/incident-demo-001.m4a',
        triage: {
          type: 'respiratory',
          severity: 'high',
          summary: 'Guest reports severe breathing difficulty and dizziness.',
        },
        status: 'searching',
        hospital_id: 'apollo-bengaluru',
        ambulance_id: null,
        timestamp: createTimestamp(1),
        notification_sent: true,
        acknowledged: false,
        on_site_responder: null,
      },
      {
        id: 'incident-demo-002',
        incident_id: 'incident-demo-002',
        user_id: 'guest-demo-002',
        location: geoPoint(12.95844, 77.60181),
        floor_info: 'Pool deck',
        audio_url: 'gs://demo-bucket/audio/incident-demo-002.m4a',
        triage: {
          type: 'fall',
          severity: 'medium',
          summary: 'Slip near pool area with possible ankle injury.',
        },
        status: 'in_transit',
        hospital_id: 'apollo-bengaluru',
        ambulance_id: 'apollo-bengaluru-amb-2',
        timestamp: createTimestamp(8),
        notification_sent: true,
        acknowledged: true,
        on_site_responder: 'staff-demo-001',
      },
      {
        id: 'incident-demo-003',
        incident_id: 'incident-demo-003',
        user_id: 'guest-demo-003',
        location: geoPoint(12.96962, 77.58678),
        floor_info: 'Lobby',
        audio_url: null,
        triage: {
          type: 'cardiac',
          severity: 'critical',
          summary: 'Chest pain reported, CPR team activated.',
        },
        status: 'resolved',
        hospital_id: 'fortis-nagarbhavi',
        ambulance_id: 'fortis-nagarbhavi-amb-1',
        timestamp: createTimestamp(26),
        notification_sent: true,
        acknowledged: true,
        on_site_responder: 'staff-demo-001',
      },
    ],
    ambulances: {
      'apollo-bengaluru-amb-1': {
        ambulance_id: 'apollo-bengaluru-amb-1',
        hospital_id: 'apollo-bengaluru',
        current_location: geoPoint(12.96511, 77.59791),
        status: 'idle',
        incident_id: null,
      },
      'apollo-bengaluru-amb-2': {
        ambulance_id: 'apollo-bengaluru-amb-2',
        hospital_id: 'apollo-bengaluru',
        current_location: geoPoint(12.96311, 77.60091),
        status: 'assigned',
        incident_id: 'incident-demo-002',
      },
      'fortis-nagarbhavi-amb-1': {
        ambulance_id: 'fortis-nagarbhavi-amb-1',
        hospital_id: 'fortis-nagarbhavi',
        current_location: geoPoint(12.96962, 77.58678),
        status: 'idle',
        incident_id: null,
      },
    },
    hospitals: {
      'apollo-bengaluru': {
        hospital_id: 'apollo-bengaluru',
        name: 'Apollo Hospitals Bannerghatta',
      },
      'fortis-nagarbhavi': {
        hospital_id: 'fortis-nagarbhavi',
        name: 'Fortis Hospital Nagarbhavi',
      },
    },
    sequence: 4,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readState() {
  if (typeof window === 'undefined') {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    return { ...createInitialState(), ...JSON.parse(raw) };
  } catch (_) {
    return createInitialState();
  }
}

let state = readState();

function persist() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emit() {
  persist();
  listeners.forEach((listener) => listener(clone(state)));
}

function setState(updater) {
  state = updater(clone(state));
  emit();
}

function clearTimers() {
  activeTimers.forEach((timer) => window.clearTimeout(timer));
  activeTimers = [];
}

function queueTimer(callback, delayMs) {
  const timerId = window.setTimeout(callback, delayMs);
  activeTimers.push(timerId);
  return timerId;
}

function scheduleAmbulanceProgress(incidentId, ambulanceId) {
  const checkpoints = [
    geoPoint(12.96891, 77.59601),
    geoPoint(12.97041, 77.59491),
    geoPoint(12.97194, 77.59411),
  ];

  checkpoints.forEach((point, index) => {
    queueTimer(() => {
      setState((current) => {
        const next = clone(current);
        const ambulance = next.ambulances[ambulanceId];
        if (!ambulance || ambulance.incident_id !== incidentId) {
          return next;
        }

        ambulance.current_location = point;
        if (index === 0) {
          const incident = next.incidents.find((entry) => entry.id === incidentId);
          if (incident) {
            incident.status = 'in_transit';
          }
        }
        if (index === checkpoints.length - 1) {
          ambulance.status = 'idle';
          ambulance.incident_id = null;
          const incident = next.incidents.find((entry) => entry.id === incidentId);
          if (incident) {
            incident.status = 'resolved';
          }
        }
        return next;
      });
    }, (index + 1) * 3500);
  });
}

export function subscribeDemoState(listener) {
  listeners.add(listener);
  listener(clone(state));
  return () => listeners.delete(listener);
}

export function getDemoSnapshot() {
  return clone(state);
}

export function signInDemo({ role }) {
  const session =
    role === 'hospital'
      ? {
          uid: 'hospital-demo-001',
          email: 'apollo.demo@hospital.local',
          role: 'hospital',
          hospitalId: 'apollo-bengaluru',
        }
      : {
          uid: 'staff-demo-001',
          email: 'staff.demo@hotel.local',
          role: 'staff',
          hospitalId: null,
        };

  setState((current) => ({ ...current, session }));
}

export function signOutDemo() {
  setState((current) => ({ ...current, session: null }));
}

export function getDemoIncidents({ role, hospitalId }) {
  const incidents = clone(state.incidents)
    .map((incident) => ({
      ...incident,
      guest: state.users[incident.user_id] || null,
      responder: incident.on_site_responder ? state.users[incident.on_site_responder] || null : null,
    }))
    .sort((left, right) => right.timestamp - left.timestamp);
  if (role === 'hospital') {
    return incidents.filter((incident) => incident.hospital_id === hospitalId);
  }
  if (role === 'staff') {
    return incidents;
  }
  return [];
}

export function acceptDemoIncident(incidentId) {
  setState((current) => {
    const next = clone(current);
    const incident = next.incidents.find((entry) => entry.id === incidentId);
    if (!incident || incident.status !== 'searching') {
      return next;
    }

    const ambulanceId = 'apollo-bengaluru-amb-1';
    const ambulance = next.ambulances[ambulanceId];
    incident.status = 'accepted';
    incident.acknowledged = true;
    incident.ambulance_id = ambulanceId;
    ambulance.status = 'assigned';
    ambulance.incident_id = incidentId;
    return next;
  });

  scheduleAmbulanceProgress(incidentId, 'apollo-bengaluru-amb-1');
}

export function assignDemoResponder(incidentId, staffUid) {
  setState((current) => {
    const next = clone(current);
    const incident = next.incidents.find((entry) => entry.id === incidentId);
    if (incident) {
      incident.on_site_responder = staffUid;
    }
    return next;
  });
}

export function createDemoIncident({
  name,
  bloodGroup,
  medicalHistory,
  emergencyContact,
  floorInfo,
  incidentType,
  severity,
  summary,
}) {
  setState((current) => {
    const next = clone(current);
    const sequence = next.sequence;
    const incidentId = `incident-demo-00${sequence}`;
    const userId = `guest-demo-00${sequence}`;
    next.sequence += 1;
    next.users[userId] = {
      uid: userId,
      name,
      blood_group: bloodGroup,
      medical_history: medicalHistory,
      emergency_contacts: emergencyContact ? [emergencyContact] : [],
      role: 'user',
      fcm_token: `demo_fcm_guest_${sequence}`,
      status: 'in_crisis',
    };
    next.incidents.unshift({
      id: incidentId,
      incident_id: incidentId,
      user_id: userId,
      location: geoPoint(12.972 + sequence * 0.0003, 77.594 + sequence * 0.0002),
      floor_info: floorInfo,
      audio_url: `gs://demo-bucket/audio/${incidentId}.m4a`,
      triage: {
        type: incidentType,
        severity,
        summary,
      },
      status: 'searching',
      hospital_id: 'apollo-bengaluru',
      ambulance_id: null,
      timestamp: Date.now(),
      notification_sent: true,
      acknowledged: false,
      on_site_responder: null,
    });
    return next;
  });
}

export function spawnDemoIncident() {
  const sequence = state.sequence;
  createDemoIncident({
    name: sequence % 2 === 0 ? 'Walk-in Guest' : 'Poolside Guest',
    bloodGroup: sequence % 2 === 0 ? 'AB+' : 'O+',
    medicalHistory: sequence % 2 === 0 ? 'Diabetes, carries insulin pen.' : 'No known conditions.',
    emergencyContact: sequence % 2 === 0 ? '+91 88000 11000' : '+91 88111 22000',
    floorInfo: sequence % 2 === 0 ? 'Banquet Hall' : 'Sky Lounge',
    incidentType: sequence % 2 === 0 ? 'bleeding' : 'stroke',
    severity: sequence % 2 === 0 ? 'high' : 'critical',
    summary:
      sequence % 2 === 0
        ? 'Guest has a deep laceration with active bleeding.'
        : 'Guest shows slurred speech and unilateral weakness.',
  });
}

export function getDemoUser(uid) {
  if (!uid) {
    return null;
  }
  return clone(state.users[uid] || null);
}

export function resetDemoState() {
  clearTimers();
  state = createInitialState();
  emit();
}
