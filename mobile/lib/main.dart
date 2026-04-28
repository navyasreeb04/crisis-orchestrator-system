import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'screens/auth_gate.dart';
import 'services/auth_service.dart';
import 'services/incident_service.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await NotificationService.initialize();

  runApp(const CrisisOrchestratorApp());
}

class CrisisOrchestratorApp extends StatelessWidget {
  const CrisisOrchestratorApp({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();
    final incidentService = IncidentService();

    return MaterialApp(
      title: 'Crisis Orchestrator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFB42318),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF7F3ED),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(18)),
          ),
        ),
      ),
      home: AuthGate(
        authService: authService,
        incidentService: incidentService,
      ),
    );
  }
}
