import 'dart:async';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class AudioService {
  AudioService() : _recorder = AudioRecorder();

  final AudioRecorder _recorder;

  Future<File?> recordEmergencyClip() async {
    try {
      if (!await _recorder.hasPermission()) {
        return null;
      }

      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/emergency_${DateTime.now().millisecondsSinceEpoch}.m4a';

      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc, sampleRate: 16000, numChannels: 1),
        path: filePath,
      );

      await Future<void>.delayed(const Duration(seconds: 10));
      final recordedPath = await _recorder.stop();
      if (recordedPath == null || recordedPath.isEmpty) {
        return null;
      }

      final file = File(recordedPath);
      return await file.exists() ? file : null;
    } catch (_) {
      try {
        await _recorder.stop();
      } catch (_) {}
      return null;
    }
  }
}
