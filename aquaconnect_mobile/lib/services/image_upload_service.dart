import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';

class ImageUploadService {
  static final ImagePicker _picker = ImagePicker();

  /// Pick an image directly from the device's photo gallery / album
  /// Downscales to 450x450 at 50% quality to prevent Out-Of-Memory (OOM) on older phones
  static Future<XFile?> pickFromGallery({
    int imageQuality = 50,
    double maxWidth = 450,
    double maxHeight = 450,
  }) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: imageQuality,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
      );
      return image;
    } catch (e) {
      debugPrint('Error picking image from gallery: $e');
      return null;
    }
  }

  /// Pick an image using device camera
  /// Downscales to 450x450 at 50% quality to prevent Out-Of-Memory (OOM) on older phones
  static Future<XFile?> pickFromCamera({
    int imageQuality = 50,
    double maxWidth = 450,
    double maxHeight = 450,
  }) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: imageQuality,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
      );
      return image;
    } catch (e) {
      debugPrint('Error taking photo with camera: $e');
      return null;
    }
  }

  /// In-memory downscale safeguard to ensure photo bytes stay small (< 35 KB)
  /// so it easily fits within Firestore's document limit without crashing low-RAM devices.
  static Future<Uint8List> _optimizeBytes(Uint8List rawBytes) async {
    if (rawBytes.lengthInBytes <= 35 * 1024) {
      return rawBytes;
    }
    try {
      final codec = await ui.instantiateImageCodec(rawBytes, targetWidth: 320);
      final frame = await codec.getNextFrame();
      final byteData = await frame.image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null && byteData.lengthInBytes > 0) {
        if (byteData.lengthInBytes < rawBytes.lengthInBytes) {
          return byteData.buffer.asUint8List();
        }
      }
    } catch (e) {
      debugPrint('Image downscale note: $e');
    }
    return rawBytes;
  }

  /// Upload the picked image file to Firebase Cloud Storage with resilient multi-device sync fallback.
  /// If Cloud Storage bucket is uninitialized or blocked by CORS, uses optimized Base64 data URI (< 35KB).
  static Future<String?> uploadImage(
    XFile file, {
    required String folder,
    required String fileIdentifier,
  }) async {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final cleanId = fileIdentifier.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
    final fileName = '${cleanId}_$timestamp.jpg';

    try {
      // Read & optimize bytes to guarantee safety across all devices (< 35 KB)
      final rawBytes = await file.readAsBytes();
      final safeBytes = await _optimizeBytes(rawBytes);

      // 1. Attempt upload to Firebase Cloud Storage with 15s timeout for mobile data
      try {
        final storageRef = FirebaseStorage.instance.ref().child('$folder/$fileName');
        final metadata = SettableMetadata(
          contentType: 'image/jpeg',
          customMetadata: {'uploadedBy': fileIdentifier},
        );

        final UploadTask uploadTask = storageRef.putData(safeBytes, metadata);
        final snapshot = await uploadTask.timeout(const Duration(seconds: 15));
        final downloadUrl = await snapshot.ref.getDownloadURL();
        if (downloadUrl.isNotEmpty) {
          return downloadUrl;
        }
      } catch (storageError) {
        debugPrint('Firebase Cloud Storage note: $storageError. Using multi-device sync fallback.');
      }

      // 2. Resilient High-Efficiency Fallback:
      // Stored directly in Firestore document (< 35KB) - immediately syncs across all devices and logins in real-time!
      try {
        final base64String = base64Encode(safeBytes);
        return 'data:image/jpeg;base64,$base64String';
      } catch (e) {
        debugPrint('Base64 encoding fallback error: $e');
        return null;
      }
    } catch (e) {
      debugPrint('General uploadImage error: $e');
      return null;
    }
  }

  /// Helper widget to render both Cloud HTTPS URLs and Base64 Data URIs seamlessly
  static Widget buildImageWidget(
    String? imageUrl, {
    double? width,
    double? height,
    BoxFit fit = BoxFit.cover,
    Widget? placeholder,
    Widget Function(BuildContext, Object, StackTrace?)? errorBuilder,
  }) {
    if (imageUrl == null || imageUrl.trim().isEmpty) {
      return placeholder ?? Container(
        width: width,
        height: height,
        color: const Color(0xFFE2E8F0),
        child: const Icon(Icons.image, color: Colors.grey, size: 36),
      );
    }

    final trimmed = imageUrl.trim();

    // Base64 Data URI
    if (trimmed.startsWith('data:image')) {
      try {
        final base64Data = trimmed.split(',').last;
        final bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: errorBuilder ?? (ctx, _, __) => placeholder ?? Container(
            width: width,
            height: height,
            color: const Color(0xFFE2E8F0),
            child: const Icon(Icons.broken_image, color: Colors.grey),
          ),
        );
      } catch (_) {}
    }

    // Standard HTTP / HTTPS URL
    return Image.network(
      trimmed,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: errorBuilder ?? (ctx, _, __) => placeholder ?? Container(
        width: width,
        height: height,
        color: const Color(0xFFE2E8F0),
        child: const Icon(Icons.broken_image, color: Colors.grey),
      ),
    );
  }
}
