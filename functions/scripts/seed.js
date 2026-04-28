const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const hospitals = [
  {
    hospital_id: 'apollo-bengaluru',
    name: 'Apollo Hospitals Bannerghatta',
    location: new admin.firestore.GeoPoint(12.8875, 77.597),
    fcm_token: 'mock_fcm_hospital_apollo_bannerghatta_001',
    active_ambulances: 0,
    is_available: true,
  },
  {
    hospital_id: 'fortis-nagarbhavi',
    name: 'Fortis Hospital Nagarbhavi',
    location: new admin.firestore.GeoPoint(12.9686, 77.5003),
    fcm_token: 'mock_fcm_hospital_fortis_nagarbhavi_002',
    active_ambulances: 0,
    is_available: true,
  },
  {
    hospital_id: 'manipal-oldairport',
    name: 'Manipal Hospital Old Airport Road',
    location: new admin.firestore.GeoPoint(12.958, 77.6487),
    fcm_token: 'mock_fcm_hospital_manipal_oldairport_003',
    active_ambulances: 0,
    is_available: true,
  },
];

const createAmbulances = (hospital) => {
  const [lat, lng] = [hospital.location.latitude, hospital.location.longitude];
  return [1, 2].map((offset) => ({
    ambulance_id: `${hospital.hospital_id}-amb-${offset}`,
    hospital_id: hospital.hospital_id,
    current_location: new admin.firestore.GeoPoint(
      Number((lat + offset * 0.0012).toFixed(6)),
      Number((lng + offset * 0.0012).toFixed(6)),
    ),
    status: 'idle',
    incident_id: null,
  }));
};

async function seed() {
  const batch = db.batch();

  hospitals.forEach((hospital) => {
    const hospitalRef = db.collection('hospitals').doc(hospital.hospital_id);
    batch.set(hospitalRef, hospital, { merge: true });

    createAmbulances(hospital).forEach((ambulance) => {
      const ambulanceRef = db.collection('ambulances').doc(ambulance.ambulance_id);
      batch.set(ambulanceRef, ambulance, { merge: true });
    });
  });

  const staffUser = {
    uid: 'staff-demo-001',
    name: 'Hotel Duty Manager',
    blood_group: 'O+',
    medical_history: 'Not applicable for staff operations profile.',
    emergency_contacts: ['+919876543210'],
    role: 'staff',
    fcm_token: 'mock_fcm_staff_hotel_manager_001',
    status: 'safe',
  };

  batch.set(db.collection('users').doc(staffUser.uid), staffUser, { merge: true });

  await batch.commit();
  console.log('Seeded hospitals, ambulances, and staff user successfully.');
}

seed().catch((error) => {
  console.error('Seeder failed:', error);
  process.exitCode = 1;
});
