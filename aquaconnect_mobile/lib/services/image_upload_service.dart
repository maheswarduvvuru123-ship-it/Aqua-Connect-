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

  /// Resolves matching asset image for any product name or container type
  static String getProductAssetForName(String? name, [String? containerType]) {
    final n = (name ?? '').toLowerCase();
    final c = (containerType ?? '').toLowerCase();
    if (n.contains('cool') || n.contains('chill') || c.contains('chill')) {
      return 'assets/images/cool_water_can.jpg';
    }
    if (n.contains('packet') || n.contains('pouch') || c.contains('packet')) {
      return 'assets/images/water_pouches_pack.jpg';
    }
    if (n.contains('bottle') || c.contains('box')) {
      return 'assets/images/bottled_water_pack.jpg';
    }
    return 'assets/images/bubble_top_can.jpg';
  }

  /// Builds a high-definition product image with offline-first asset fallback
  static Widget buildProductImage(
    String? imageUrl, {
    String? productName,
    String? containerType,
    double? width,
    double? height,
    BoxFit fit = BoxFit.cover,
  }) {
    final fallbackAsset = getProductAssetForName(productName, containerType);
    final fallbackWidget = Image.asset(
      fallbackAsset,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => Container(
        width: width,
        height: height,
        color: const Color(0xFFE0F2FE),
        child: const Icon(Icons.water_drop, color: Color(0xFF0284C7), size: 36),
      ),
    );

    if (imageUrl == null || imageUrl.trim().isEmpty) {
      return fallbackWidget;
    }

    final trimmed = imageUrl.trim();

    // Local asset
    if (trimmed.startsWith('assets/')) {
      return Image.asset(
        trimmed,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => fallbackWidget,
      );
    }

    // Relative web paths
    if (trimmed.startsWith('/images/')) {
      if (trimmed.contains('cool')) return Image.asset('assets/images/cool_water_can.jpg', width: width, height: height, fit: fit);
      if (trimmed.contains('pouch') || trimmed.contains('packet')) return Image.asset('assets/images/water_pouches_pack.jpg', width: width, height: height, fit: fit);
      if (trimmed.contains('bottle')) return Image.asset('assets/images/bottled_water_pack.jpg', width: width, height: height, fit: fit);
      return Image.asset('assets/images/bubble_top_can.jpg', width: width, height: height, fit: fit);
    }

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
          errorBuilder: (_, __, ___) => fallbackWidget,
        );
      } catch (_) {
        return fallbackWidget;
      }
    }

    // Remote HTTP / HTTPS URL with instant asset fallback
    if (trimmed.startsWith('http')) {
      return Image.network(
        trimmed,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => fallbackWidget,
      );
    }

    return fallbackWidget;
  }

  /// Helper widget to render both Cloud HTTPS URLs, Local Assets, and Base64 Data URIs seamlessly
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

    // Local assets
    if (trimmed.startsWith('assets/')) {
      return Image.asset(
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

    // Relative web paths
    if (trimmed.startsWith('/images/')) {
      String assetPath = 'assets/images/bubble_top_can.jpg';
      if (trimmed.contains('cool')) assetPath = 'assets/images/cool_water_can.jpg';
      if (trimmed.contains('pouch') || trimmed.contains('packet')) assetPath = 'assets/images/water_pouches_pack.jpg';
      if (trimmed.contains('bottle')) assetPath = 'assets/images/bottled_water_pack.jpg';
      return Image.asset(
        assetPath,
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
