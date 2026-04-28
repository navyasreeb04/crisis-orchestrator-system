import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../models/app_user.dart';
import '../services/auth_service.dart';
import '../services/incident_service.dart';

class StaffDashboardScreen extends StatelessWidget {
  const StaffDashboardScreen({
    super.key,
    required this.profile,
    required this.authService,
    required this.incidentService,
  });

  final AppUser profile;
  final AuthService authService;
  final IncidentService incidentService;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff Dashboard'),
        actions: <Widget>[
          IconButton(
            onPressed: authService.signOut,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: incidentService.watchAllIncidents(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final incidents = snapshot.data!.docs;
          if (incidents.isEmpty) {
            return const Center(child: Text('No incidents recorded yet.'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: incidents.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final data = incidents[index].data();
              final triage = (data['triage'] ?? <String, dynamic>{}) as Map<String, dynamic>;
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Incident ${data['incident_id'] ?? incidents[index].id}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text('Severity: ${triage['severity'] ?? 'medium'}'),
                      Text('Type: ${triage['type'] ?? 'unknown'}'),
                      Text('Summary: ${triage['summary'] ?? 'Awaiting triage'}'),
                      const SizedBox(height: 16),
                      FilledButton.tonal(
                        onPressed: () async {
                          try {
                            await incidentService.assignOnSiteResponder(
                              incidentId: incidents[index].id,
                              staffUid: profile.uid,
                            );
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('On-site responder assigned.')),
                              );
                            }
                          } catch (error) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(error.toString())),
                              );
                            }
                          }
                        },
                        child: const Text('On-site Responder'),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
