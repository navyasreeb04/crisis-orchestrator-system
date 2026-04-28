const { DEFAULT_TRIAGE } = require('./constants');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeTriage(raw) {
  if (!isObject(raw)) {
    return { ...DEFAULT_TRIAGE };
  }

  const type = isNonEmptyString(raw.type) ? raw.type.trim().toLowerCase() : DEFAULT_TRIAGE.type;
  const severity = isNonEmptyString(raw.severity) ? raw.severity.trim().toLowerCase() : DEFAULT_TRIAGE.severity;
  const summary = isNonEmptyString(raw.summary) ? raw.summary.trim() : DEFAULT_TRIAGE.summary;

  return { type, severity, summary };
}

function isLikelyFcmToken(token) {
  return isNonEmptyString(token) && token.trim().length >= 20 && !token.includes(' ');
}

function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validateGeoPoint(value) {
  if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    throw new Error('Invalid GeoPoint payload.');
  }

  return {
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

module.exports = {
  isLikelyFcmToken,
  isNonEmptyString,
  sanitizeTriage,
  toFiniteNumber,
  validateGeoPoint,
};
