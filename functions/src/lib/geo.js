const EARTH_RADIUS_KM = 6371;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(origin, destination) {
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function orderByDistance(origin, records, accessor) {
  return [...records]
    .map((record) => ({
      record,
      distanceKm: haversineDistanceKm(origin, accessor(record)),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

function interpolateCoordinate(start, end, ratio) {
  return start + (end - start) * ratio;
}

module.exports = {
  haversineDistanceKm,
  interpolateCoordinate,
  orderByDistance,
};
