function readEnv(name, fallback = null) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

const CONFIG = Object.freeze({
  googleMapsApiKey: readEnv('GOOGLE_MAPS_API_KEY'),
  vertexProjectId: readEnv('VERTEX_PROJECT_ID'),
  vertexLocation: readEnv('VERTEX_LOCATION', 'us-central1'),
  storageBucket: readEnv('FIREBASE_STORAGE_BUCKET'),
});

module.exports = {
  CONFIG,
};
