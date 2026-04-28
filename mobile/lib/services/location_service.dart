import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';

class LocationService {
  const LocationService();

  static const GeoPoint safeDefault = GeoPoint(12.9716, 77.5946);

  Future<GeoPoint> getEmergencyLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return await _lastKnownOrDefault();
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.deniedForever || permission == LocationPermission.denied) {
        return await _lastKnownOrDefault();
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      return GeoPoint(position.latitude, position.longitude);
    } catch (_) {
      return await _lastKnownOrDefault();
    }
  }

  Future<GeoPoint> _lastKnownOrDefault() async {
    try {
      final position = await Geolocator.getLastKnownPosition();
      if (position != null) {
        return GeoPoint(position.latitude, position.longitude);
      }
      return safeDefault;
    } catch (_) {
      return safeDefault;
    }
  }
}
