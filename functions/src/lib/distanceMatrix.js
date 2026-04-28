const { CONFIG } = require('./config');
const { haversineDistanceKm } = require('./geo');

async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackEtaMinutes(origin, destination) {
  const distanceKm = haversineDistanceKm(origin, destination);
  const averageSpeedKmPerHour = 35;
  return Math.max(2, Math.round((distanceKm / averageSpeedKmPerHour) * 60));
}

async function rankHospitalsByEta(origin, hospitals) {
  if (!CONFIG.googleMapsApiKey || hospitals.length === 0) {
    return hospitals
      .map((hospital) => ({
        ...hospital,
        etaMinutes: fallbackEtaMinutes(origin, hospital.location),
        etaSource: 'fallback',
      }))
      .sort((left, right) => left.etaMinutes - right.etaMinutes);
  }

  const destinations = hospitals
    .map((hospital) => `${hospital.location.latitude},${hospital.location.longitude}`)
    .join('|');

  const origins = `${origin.latitude},${origin.longitude}`;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    origins,
  )}&destinations=${encodeURIComponent(destinations)}&departure_time=now&mode=driving&key=${encodeURIComponent(
    CONFIG.googleMapsApiKey,
  )}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Distance Matrix returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const elements = payload?.rows?.[0]?.elements;
    if (!Array.isArray(elements) || elements.length !== hospitals.length) {
      throw new Error('Unexpected Distance Matrix payload shape.');
    }

    return hospitals
      .map((hospital, index) => {
        const element = elements[index];
        const etaSeconds = element?.duration_in_traffic?.value ?? element?.duration?.value;
        const isValid = element?.status === 'OK' && Number.isFinite(etaSeconds);
        return {
          ...hospital,
          etaMinutes: isValid
            ? Math.max(1, Math.ceil(etaSeconds / 60))
            : fallbackEtaMinutes(origin, hospital.location),
          etaSource: isValid ? 'google-distance-matrix' : 'fallback',
        };
      })
      .sort((left, right) => left.etaMinutes - right.etaMinutes);
  } catch (error) {
    console.error('Distance Matrix ranking failed:', error);
    return hospitals
      .map((hospital) => ({
        ...hospital,
        etaMinutes: fallbackEtaMinutes(origin, hospital.location),
        etaSource: 'fallback',
      }))
      .sort((left, right) => left.etaMinutes - right.etaMinutes);
  }
}

module.exports = {
  rankHospitalsByEta,
};
