import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../models/app_user.dart';
import '../models/incident_record.dart';
import '../services/auth_service.dart';
import '../services/incident_service.dart';
import '../services/notification_service.dart';
import '../widgets/live_ambulance_map.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({
    super.key,
    required this.profile,
    required this.authService,
    required this.incidentService,
  });

  final AppUser profile;
  final AuthService authService;
  final IncidentService incidentService;

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final TextEditingController _floorController = TextEditingController();
  bool _busy = false;
  StreamSubscription<NotificationEvent>? _notificationSubscription;

  @override
  void initState() {
    super.initState();
    _notificationSubscription = NotificationService.events.listen((event) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${event.title}: ${event.body}')),
      );
    });
  }

  @override
  void dispose() {
    _floorController.dispose();
    _notificationSubscription?.cancel();
    super.dispose();
  }

  Future<void> _triggerSos() async {
    setState(() {
      _busy = true;
    });

    final result = await widget.incidentService.triggerSos(
      user: widget.profile,
      floorInfo: _floorController.text,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message)),
      );
      setState(() {
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency SOS'),
        actions: <Widget>[
          IconButton(
            onPressed: widget.authService.signOut,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: widget.incidentService.watchUserIncidents(widget.profile.uid),
        builder: (context, snapshot) {
          final latestIncident = snapshot.hasData && snapshot.data!.docs.isNotEmpty
              ? IncidentRecord.fromSnapshot(snapshot.data!.docs.first)
              : null;

          return ListView(
            padding: const EdgeInsets.all(20),
            children: <Widget>[
              Text(
                'One tap triggers GPS capture, 10-second audio triage, hospital dispatch, and ambulance tracking.',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _floorController,
                decoration: const InputDecoration(
                  labelText: 'Floor or room information',
                  hintText: 'Room 804, North wing',
                ),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _busy ? null : _triggerSos,
                icon: const Icon(Icons.sos),
                label: Text(_busy ? 'Activating SOS...' : 'Trigger SOS'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(64),
                  backgroundColor: const Color(0xFFB42318),
                ),
              ),
              const SizedBox(height: 28),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text('User: ${widget.profile.name}'),
                      Text('Blood group: ${widget.profile.bloodGroup}'),
                      Text('Status: ${widget.profile.status}'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              if (latestIncident != null) ...<Widget>[
                Text(
                  'Latest incident',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Status: ${latestIncident.status}'),
                        Text('Triage: ${latestIncident.triageType} / ${latestIncident.triageSeverity}'),
                        Text('Summary: ${latestIncident.triageSummary}'),
                        if (latestIncident.ambulanceId != null) ...<Widget>[
                          const SizedBox(height: 16),
                          LiveAmbulanceMap(ambulanceId: latestIncident.ambulanceId!),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
