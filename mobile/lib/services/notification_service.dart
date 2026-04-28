import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('last_incident_id', message.data['incidentId']?.toString() ?? '');
}

class NotificationEvent {
  const NotificationEvent({
    required this.title,
    required this.body,
    required this.data,
  });

  final String title;
  final String body;
  final Map<String, dynamic> data;
}

class NotificationService {
  NotificationService._();

  static final StreamController<NotificationEvent> _controller =
      StreamController<NotificationEvent>.broadcast();

  static Stream<NotificationEvent> get events => _controller.stream;

  static Future<void> initialize() async {
    await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    FirebaseMessaging.onMessage.listen((message) {
      _controller.add(
        NotificationEvent(
          title: message.notification?.title ?? 'Emergency update',
          body: message.notification?.body ?? 'A new emergency update is available.',
          data: message.data,
        ),
      );
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('last_incident_id', message.data['incidentId']?.toString() ?? '');
    });
  }

  static Future<String?> getLastIncidentId() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString('last_incident_id');
    return value == null || value.isEmpty ? null : value;
  }
}
