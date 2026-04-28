# Crisis Orchestrator System

This repository contains a full-stack crisis orchestration system for hospitality emergency response with:

- Firebase Auth, Firestore, Storage, Cloud Functions, and FCM
- Vertex AI Gemini 1.5 Flash emergency audio triage
- Google Maps Distance Matrix ETA ranking with haversine fallback
- React hospital and staff dashboards
- Flutter SOS mobile client with offline SMS fallback

## Repository Layout

- `functions`: Firebase Cloud Functions orchestrator, triage, dispatch, seeder
- `web`: React + Tailwind operations dashboard
- `mobile`: Flutter mobile SOS client
- `firestore.rules`: Firestore security rules
- `storage.rules`: Firebase Storage rules

## Backend Setup

1. Install Firebase CLI and authenticate with your target Firebase project.
2. Add environment variables in `functions/.env` using the keys from [functions/.env.example](./functions/.env.example).
3. Deploy Firestore rules and indexes:

```powershell
firebase deploy --only firestore:rules,firestore:indexes,storage
```

4. Seed hospital, ambulance, and staff data:

```powershell
cd functions
node scripts/seed.js
```

5. Deploy Cloud Functions:

```powershell
firebase deploy --only functions
```

## Web Setup

1. Copy `web/.env.example` to `web/.env` and fill in your Firebase web config.
2. Install packages with `npm.cmd install`.
3. Start the dashboard:

```powershell
cd web
npm.cmd run dev
```

Hospital dashboard accounts must have Firebase custom claims:

- `role: "hospital"`
- `hospitalId: "<hospital_id>"`

Staff dashboard accounts can use a Firestore `users/{uid}` document with `role: "staff"`.

### Zero-Credentials Demo Mode

If you do not have Firebase or GCP credentials yet, the web app can run entirely in local demo mode.

1. Keep [web/.env](./web/.env) as:

```env
VITE_DEMO_MODE=true
```

2. Start the dashboard:

```powershell
cd web
npm.cmd run dev
```

3. Open the app and choose:

- `Demo Hospital View`
- `Demo Staff View`

Demo mode includes:

- mock auth
- seeded incidents
- local accept-dispatch simulation
- ambulance movement progression
- reset and spawn-incident controls

## Flutter Setup

1. Configure Android and iOS Firebase apps with your `google-services.json` and `GoogleService-Info.plist`.
2. Add Google Maps platform keys for mobile maps rendering.
3. Run package install:

```powershell
cd mobile
flutter pub get
```

4. Launch the app:

```powershell
flutter run
```

## Operational Flow

1. User taps SOS in Flutter.
2. App captures location, records 10 seconds of audio, uploads to Storage, and writes an `incidents` document.
3. Cloud Function transitions incident state from `created` to `analyzing` to `searching`.
4. Gemini extracts triage JSON with regex-safe parsing.
5. Nearby hospitals are filtered with haversine distance and ranked by Google ETA or fallback ETA.
6. First hospital is notified immediately and retries roll through the remaining hospitals at 15-second intervals until accepted.
7. Hospital accepts through the React dashboard using `httpsCallable("acceptIncident")`.
8. Nearest idle ambulance is assigned and simulated toward the incident every 3 seconds until resolution.

## Reliability Notes

- AI parsing failure falls back to a safe triage object.
- Google Distance Matrix failure falls back to haversine-based ETA.
- GPS failure falls back to last known location or a safe default coordinate.
- FCM token validation prevents invalid dispatch attempts from crashing orchestration.
- Mobile offline mode uses SMS fallback to emergency contacts.

## GitHub Publish Checklist

This repository is ready to publish with the included `.gitignore` and `.gitattributes`.

Before your first push:

1. Keep real secrets only in local `.env` files.
2. Leave `web/.env.example` and `functions/.env.example` as the shared templates.
3. Do not commit Firebase service credentials, mobile Google config files, `node_modules`, or build output folders.

Recommended first push flow:

```powershell
cd "C:\Users\navya\OneDrive\Documents\New project"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```
