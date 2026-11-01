import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class PlatformSettings {
  final String adminUpiId;
  final String adminPhone;
  final String adminQrCodeUrl; // Base64 data URL or HTTP image URL
  final String customerCarePhone;
  final String customerCareWhatsapp;

  const PlatformSettings({
    this.adminUpiId = 'aquaconnect.admin@upi',
    this.adminPhone = '8522828688',
    this.adminQrCodeUrl = '',
    this.customerCarePhone = '+91 85228 28688',
    this.customerCareWhatsapp = '+91 85228 28688',
  });

  factory PlatformSettings.fromMap(Map<String, dynamic>? data) {
    if (data == null) return const PlatformSettings();
    return PlatformSettings(
      adminUpiId: (data['adminUpiId']?.toString().trim().isNotEmpty ?? false)
          ? data['adminUpiId'].toString().trim()
          : 'aquaconnect.admin@upi',
      adminPhone: (data['adminPhone']?.toString().trim().isNotEmpty ?? false)
          ? data['adminPhone'].toString().trim()
          : '8522828688',
      adminQrCodeUrl: data['adminQrCodeUrl']?.toString().trim() ?? '',
      customerCarePhone: data['customerCarePhone']?.toString().trim() ?? '+91 85228 28688',
      customerCareWhatsapp: data['customerCareWhatsapp']?.toString().trim() ?? '+91 85228 28688',
    );
  }
}

class PlatformConfigService {
  static final PlatformConfigService instance = PlatformConfigService._();
  PlatformConfigService._() {
    _initLiveListener();
  }

  PlatformSettings _settings = const PlatformSettings();
  PlatformSettings get settings => _settings;

  final StreamController<PlatformSettings> _controller = StreamController<PlatformSettings>.broadcast();
  Stream<PlatformSettings> get stream => _controller.stream;

  void _initLiveListener() {
    try {
      void processSnapshot(DocumentSnapshot snapshot) {
        if (snapshot.exists && snapshot.data() != null) {
          final data = snapshot.data() as Map<String, dynamic>;
          if (data['platform_settings'] is Map) {
            _settings = PlatformSettings.fromMap(
              Map<String, dynamic>.from(data['platform_settings'] as Map),
            );
            _controller.add(_settings);
          }
        }
      }

      // Listen to users/platform_config
      FirebaseFirestore.instance
          .collection('users')
          .doc('platform_config')
          .snapshots()
          .listen(processSnapshot, onError: (_) {});

      // Also listen to app_settings/platform_config as mirror
      FirebaseFirestore.instance
          .collection('app_settings')
          .doc('platform_config')
          .snapshots()
          .listen(processSnapshot, onError: (_) {});
    } catch (e) {
      debugPrint('PlatformConfigService initialization error: $e');
    }
  }

  /// Builds a dynamic UPI QR image URL if no custom QR code photo was uploaded by Admin
  String getFallbackQrUrl({required double amount}) {
    final upi = _settings.adminUpiId.isNotEmpty ? _settings.adminUpiId : 'aquaconnect.admin@upi';
    final amtStr = amount.toStringAsFixed(amount.truncateToDouble() == amount ? 0 : 2);
    final upiUri = 'upi://pay?pa=$upi&pn=AquaConnect%20Admin&am=$amtStr&cu=INR';
    return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${Uri.encodeComponent(upiUri)}';
  }
}

/// Dynamic QR Widget that automatically renders the Admin's uploaded QR photo
/// or dynamically generates the live UPI QR code
class AdminSubscriptionQrWidget extends StatelessWidget {
  final double amount;
  final double size;
  final PlatformSettings? settings;

  const AdminSubscriptionQrWidget({
    super.key,
    required this.amount,
    this.size = 80,
    this.settings,
  });

  @override
  Widget build(BuildContext context) {
    final currentSettings = settings ?? PlatformConfigService.instance.settings;
    final qrData = currentSettings.adminQrCodeUrl.trim();

    // 1. If Admin uploaded a custom Base64 QR code image photo from Admin Portal
    if (qrData.startsWith('data:image/') && qrData.contains('base64,')) {
      try {
        final base64Part = qrData.substring(qrData.indexOf('base64,') + 7);
        final bytes = base64Decode(base64Part);
        return ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.memory(
            bytes,
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _buildFallbackQr(currentSettings),
          ),
        );
      } catch (e) {
        debugPrint('Error decoding base64 Admin QR: $e');
      }
    }

    // 2. If Admin provided a direct HTTPS/HTTP QR code image URL
    if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          qrData,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackQr(currentSettings),
        ),
      );
    }

    // 3. Fallback: Live Dynamic QR code with Admin UPI and amount
    return _buildFallbackQr(currentSettings);
  }

  Widget _buildFallbackQr(PlatformSettings currentSettings) {
    final dynamicUrl = PlatformConfigService.instance.getFallbackQrUrl(amount: amount);
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        dynamicUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: size,
          height: size,
          color: Colors.grey.shade200,
          child: const Icon(Icons.qr_code, size: 36),
        ),
      ),
    );
  }
}

