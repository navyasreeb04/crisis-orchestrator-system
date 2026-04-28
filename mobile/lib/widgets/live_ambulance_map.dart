import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class LiveAmbulanceMap extends StatefulWidget {
  const LiveAmbulanceMap({
    super.key,
    required this.ambulanceId,
  });

  final String ambulanceId;

  @override
  State<LiveAmbulanceMap> createState() => _LiveAmbulanceMapState();
}

class _LiveAmbulanceMapState extends State<LiveAmbulanceMap> {
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _subscription;
  LatLng? _displayPosition;
  Timer? _animationTimer;

  @override
  void initState() {
    super.initState();
    _subscription = FirebaseFirestore.instance
        .collection('ambulances')
        .doc(widget.ambulanceId)
        .snapshots()
        .listen(_handleSnapshot);
  }

  void _handleSnapshot(DocumentSnapshot<Map<String, dynamic>> snapshot) {
    final point = snapshot.data()?['current_location'] as GeoPoint?;
    if (point == null) {
      return;
    }

    final nextPosition = LatLng(point.latitude, point.longitude);
    if (_displayPosition == null) {
      setState(() {
        _displayPosition = nextPosition;
      });
      return;
    }

    _animationTimer?.cancel();
    final start = _displayPosition!;
    const frames = 12;
    var step = 0;
    _animationTimer = Timer.periodic(const Duration(milliseconds: 75), (timer) {
      step += 1;
      final ratio = step / frames;
      final interpolated = LatLng(
        start.latitude + (nextPosition.latitude - start.latitude) * ratio,
        start.longitude + (nextPosition.longitude - start.longitude) * ratio,
      );

      if (mounted) {
        setState(() {
          _displayPosition = interpolated;
        });
      }

      if (step >= frames) {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _animationTimer?.cancel();
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final position = _displayPosition;
    if (position == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        height: 240,
        child: GoogleMap(
          initialCameraPosition: CameraPosition(target: position, zoom: 15),
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          markers: {
            Marker(
              markerId: const MarkerId('ambulance'),
              position: position,
              infoWindow: const InfoWindow(title: 'Assigned ambulance'),
            ),
          },
        ),
      ),
    );
  }
}
