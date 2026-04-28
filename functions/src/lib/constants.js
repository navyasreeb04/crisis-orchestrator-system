const INCIDENT_STATUS = Object.freeze({
  CREATED: 'created',
  ANALYZING: 'analyzing',
  SEARCHING: 'searching',
  ACCEPTED: 'accepted',
  IN_TRANSIT: 'in_transit',
  RESOLVED: 'resolved',
});

const AMBULANCE_STATUS = Object.freeze({
  IDLE: 'idle',
  ASSIGNED: 'assigned',
});

const USER_STATUS = Object.freeze({
  SAFE: 'safe',
  IN_CRISIS: 'in_crisis',
});

const DEFAULT_TRIAGE = Object.freeze({
  type: 'unknown',
  severity: 'medium',
  summary: 'Automated triage fallback activated. Please review manually.',
});

module.exports = {
  AMBULANCE_STATUS,
  DEFAULT_TRIAGE,
  INCIDENT_STATUS,
  USER_STATUS,
};
