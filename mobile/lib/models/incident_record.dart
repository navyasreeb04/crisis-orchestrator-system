import 'package:cloud_firestore/cloud_firestore.dart';

class IncidentRecord {
  const IncidentRecord({
    required this.id,
    required this.userId,
    required this.status,
    required this.floorInfo,
    required this.audioUrl,
    required this.triageType,
    required this.triageSeverity,
    required this.triageSummary,
    required this.location,
    required this.hospitalId,
    required this.ambulanceId,
  });

  final String id;
  final String userId;
  final String status;
  final String floorInfo;
  final String? audioUrl;
  final String triageType;
  final String triageSeverity;
  final String triageSummary;
  final GeoPoint? location;
  final String? hospitalId;
  final String? ambulanceId;

  factory IncidentRecord.fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snapshot) {
    final data = snapshot.data() ?? <String, dynamic>{};
    final triage = data['triage'] is Map<String, dynamic>
        ? data['triage'] as Map<String, dynamic>
        : <String, dynamic>{};

    return IncidentRecord(
      id: snapshot.id,
      userId: (data['user_id'] ?? '').toString(),
      status: (data['status'] ?? 'created').toString(),
      floorInfo: (data['floor_info'] ?? '').toString(),
      audioUrl: data['audio_url']?.toString(),
      triageType: (triage['type'] ?? 'unknown').toString(),
      triageSeverity: (triage['severity'] ?? 'medium').toString(),
      triageSummary: (triage['summary'] ?? 'Awaiting triage.').toString(),
      location: data['location'] as GeoPoint?,
      hospitalId: data['hospital_id']?.toString(),
      ambulanceId: data['ambulance_id']?.toString(),
    );
  }
}
