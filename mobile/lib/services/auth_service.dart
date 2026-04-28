import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../models/app_user.dart';

class AuthService {
  AuthService({
    FirebaseAuth? auth,
    FirebaseFirestore? firestore,
    FirebaseMessaging? messaging,
  })  : _auth = auth ?? FirebaseAuth.instance,
        _firestore = firestore ?? FirebaseFirestore.instance,
        _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final FirebaseMessaging _messaging;

  User? get currentUser => _auth.currentUser;

  Stream<User?> authStateChanges() => _auth.authStateChanges();

  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    required void Function(String verificationId, int? resendToken) codeSent,
    required void Function(String message) onFailed,
    required void Function() onVerified,
  }) async {
    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: (credential) async {
        await _auth.signInWithCredential(credential);
        await ensureUserProfile();
        onVerified();
      },
      verificationFailed: (exception) {
        onFailed(exception.message ?? 'Phone verification failed.');
      },
      codeSent: codeSent,
      codeAutoRetrievalTimeout: (_) {},
      timeout: const Duration(seconds: 60),
    );
  }

  Future<void> signInWithOtp({
    required String verificationId,
    required String smsCode,
  }) async {
    final credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
    await _auth.signInWithCredential(credential);
    await ensureUserProfile();
  }

  Future<void> signOut() => _auth.signOut();

  Future<AppUser> ensureUserProfile() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw StateError('No signed-in user available.');
    }

    final fcmToken = await _messaging.getToken() ?? '';
    final docRef = _firestore.collection('users').doc(user.uid);
    final snapshot = await docRef.get();

    if (!snapshot.exists) {
      final appUser = AppUser(
        uid: user.uid,
        name: user.displayName ?? 'Hotel Guest',
        bloodGroup: 'Unknown',
        medicalHistory: '',
        emergencyContacts: <String>[],
        role: 'user',
        fcmToken: fcmToken,
        status: 'safe',
      );
      await docRef.set(appUser.toMap());
      return appUser;
    }

    final current = AppUser.fromMap(snapshot.data() ?? <String, dynamic>{});
    final updated = AppUser(
      uid: current.uid,
      name: current.name,
      bloodGroup: current.bloodGroup,
      medicalHistory: current.medicalHistory,
      emergencyContacts: current.emergencyContacts,
      role: current.role,
      fcmToken: fcmToken.isEmpty ? current.fcmToken : fcmToken,
      status: current.status,
    );
    await docRef.set(updated.toMap(), SetOptions(merge: true));
    return updated;
  }

  Stream<AppUser?> watchProfile() {
    final user = _auth.currentUser;
    if (user == null) {
      return const Stream<AppUser?>.empty();
    }

    return _firestore.collection('users').doc(user.uid).snapshots().map((snapshot) {
      if (!snapshot.exists) {
        return null;
      }
      return AppUser.fromMap(snapshot.data() ?? <String, dynamic>{});
    });
  }
}
