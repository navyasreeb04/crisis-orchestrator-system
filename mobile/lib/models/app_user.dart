class AppUser {
  const AppUser({
    required this.uid,
    required this.name,
    required this.bloodGroup,
    required this.medicalHistory,
    required this.emergencyContacts,
    required this.role,
    required this.fcmToken,
    required this.status,
  });

  final String uid;
  final String name;
  final String bloodGroup;
  final String medicalHistory;
  final List<String> emergencyContacts;
  final String role;
  final String fcmToken;
  final String status;

  factory AppUser.fromMap(Map<String, dynamic> data) {
    return AppUser(
      uid: (data['uid'] ?? '').toString(),
      name: (data['name'] ?? 'Guest').toString(),
      bloodGroup: (data['blood_group'] ?? 'Unknown').toString(),
      medicalHistory: (data['medical_history'] ?? '').toString(),
      emergencyContacts: ((data['emergency_contacts'] ?? const <dynamic>[]) as List<dynamic>)
          .map((item) => item.toString())
          .where((item) => item.trim().isNotEmpty)
          .toList(),
      role: (data['role'] ?? 'user').toString(),
      fcmToken: (data['fcm_token'] ?? '').toString(),
      status: (data['status'] ?? 'safe').toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'name': name,
      'blood_group': bloodGroup,
      'medical_history': medicalHistory,
      'emergency_contacts': emergencyContacts,
      'role': role,
      'fcm_token': fcmToken,
      'status': status,
    };
  }
}
