import 'package:flutter/material.dart';

import '../models/app_user.dart';
import '../services/auth_service.dart';
import '../services/incident_service.dart';
import 'phone_auth_screen.dart';
import 'sos_screen.dart';
import 'staff_dashboard_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({
    super.key,
    required this.authService,
    required this.incidentService,
  });

  final AuthService authService;
  final IncidentService incidentService;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: authService.authStateChanges(),
      builder: (context, authSnapshot) {
        if (authSnapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        if (!authSnapshot.hasData) {
          return PhoneAuthScreen(authService: authService);
        }

        return StreamBuilder<AppUser?>(
          stream: authService.watchProfile(),
          builder: (context, profileSnapshot) {
            if (profileSnapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(body: Center(child: CircularProgressIndicator()));
            }

            if (profileSnapshot.hasError) {
              return Scaffold(
                body: Center(child: Text(profileSnapshot.error.toString())),
              );
            }

            final profile = profileSnapshot.data;
            if (profile == null) {
              return const Scaffold(
                body: Center(child: Text('User profile not found.')),
              );
            }

            if (profile.role == 'staff') {
              return StaffDashboardScreen(
                profile: profile,
                authService: authService,
                incidentService: incidentService,
              );
            }

            return SosScreen(
              profile: profile,
              authService: authService,
              incidentService: incidentService,
            );
          },
        );
      },
    );
  }
}
