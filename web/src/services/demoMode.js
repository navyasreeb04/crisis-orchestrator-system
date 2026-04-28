export const isDemoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  !import.meta.env.VITE_FIREBASE_PROJECT_ID;
