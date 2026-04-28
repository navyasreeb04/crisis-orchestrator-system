import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_sms/flutter_sms.dart';

import '../models/app_user.dart';
import 'audio_service.dart';
import 'connectivity_service.dart';
import 'location_service.dart';

class SosResult {
  const SosResult({
    required this.success,
    required this.message,
    this.incidentId,
    this.usedSmsFallback = false,
  });

  final bool success;
  final String message;
  final String? incidentId;
  final bool usedSmsFallback;
}

class IncidentService {
  IncidentService({
    FirebaseFirestore? firestore,
    FirebaseStorage? storage,
    FirebaseAuth? auth,
    ConnectivityService? connectivityService,
    LocationService? locationService,
    AudioService? audioService,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _storage = storage ?? FirebaseStorage.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _connectivityService = connectivityService ?? const ConnectivityService(),
        _locationService = locationService ?? const LocationService(),
        _audioService = audioService ?? AudioService();

  final FirebaseFirestore _firestore;
  final FirebaseStorage _storage;
  final FirebaseAuth _auth;
  final ConnectivityService _connectivityService;
  final LocationService _locationService;
  final AudioService _audioService;

  Future<SosResult> triggerSos({
    required AppUser user,
    required String floorInfo,
  }) async {
    final firebaseUser = _auth.currentUser;
    if (firebaseUser == null) {
      return const SosResult(success: false, message: 'Please sign in again before sending SOS.');
    }

    final emergencyLocation = await _locationService.getEmergencyLocation();
    final online = await _connectivityService.hasInternet();

    if (!online) {
      await _sendSmsFallback(user: user, location: emergencyLocation);
      return const SosResult(
        success: true,
        message: 'Internet unavailable. SMS fallback sent to emergency contacts.',
        usedSmsFallback: true,
      );
    }

    try {
      final audioFile = await _audioService.recordEmergencyClip();
      final audioUri = audioFile == null ? null : await _uploadAudio(firebaseUser.uid, audioFile);
      final incidentRef = _firestore.collection('incidents').doc();

      await incidentRef.set({
        'incident_id': incidentRef.id,
        'user_id': firebaseUser.uid,
        'location': emergencyLocation,
        'floor_info': floorInfo.trim().isEmpty ? 'Floor unknown' : floorInfo.trim(),
        'audio_url': audioUri,
        'triage': {
          'type': 'unknown',
          'severity': 'medium',
          'summary': 'Awaiting automated triage analysis.',
        },
        'status': 'created',
        'hospital_id': null,
        'ambulance_id': null,
        'timestamp': FieldValue.serverTimestamp(),
        'notification_sent': false,
        'acknowledged': false,
      });

      await _firestore.collection('users').doc(firebaseUser.uid).set({
        'status': 'in_crisis',
      }, SetOptions(merge: true));

      return SosResult(
        success: true,
        message: 'Emergency incident created successfully.',
        incidentId: incidentRef.id,
      );
    } catch (_) {
      await _sendSmsFallback(user: user, location: emergencyLocation);
      return const SosResult(
        success: true,
        message: 'Cloud dispatch failed. SMS fallback sent to emergency contacts.',
        usedSmsFallback: true,
      );
    }
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> watchUserIncidents(String userId) {
    return _firestore
        .collection('incidents')
        .where('user_id', isEqualTo: userId)
        .orderBy('timestamp', descending: true)
        .limit(10)
        .snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> watchAllIncidents() {
    return _firestore.collection('incidents').orderBy('timestamp', descending: true).snapshots();
  }

  Future<void> assignOnSiteResponder({
    required String incidentId,
    required String staffUid,
  }) async {
    await _firestore.collection('incidents').doc(incidentId).set({
      'on_site_responder': staffUid,
    }, SetOptions(merge: true));
  }

  Future<String> _uploadAudio(String userId, File file) async {
    final ref = _storage.ref().child(
      'incident-audio/$userId/${DateTime.now().millisecondsSinceEpoch}.m4a',
    );

    await ref.putFile(
      file,
      SettableMetadata(contentType: 'audio/aac'),
    );

    return 'gs://${ref.bucket}/${ref.fullPath}';
  }

  Future<void> _sendSmsFallback({
    required AppUser user,
    required GeoPoint location,
  }) async {
    final mapsLink = 'https://maps.google.com/?q=${location.latitude},${location.longitude}';
    final message = '''
EMERGENCY at $mapsLink
User: ${user.name}
Blood: ${user.bloodGroup}
Type: Unknown
''';

    final recipients = user.emergencyContacts.where((entry) => entry.trim().isNotEmpty).toList();
    if (recipients.isEmpty) {
      return;
    }

    await sendSMS(message: message, recipients: recipients);
  }
}
