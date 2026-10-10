class UserModel {
  final String uid;
  final String name;
  final String email;
  final String phone;
  final String role; // 'supplier' | 'customer'
  final String? profileImage;
  final String? address;
  final String? city;
  final List<String>? deliveryAreas;
  final String? gstNumber;
  final String? operatingHours;
  final String? openingTime;
  final String? closingTime;
  final bool isOpenToday;
  final DateTime createdAt;

  UserModel({
    required this.uid,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.profileImage,
    this.address,
    this.city,
    this.deliveryAreas,
    this.gstNumber,
    this.operatingHours,
    this.openingTime,
    this.closingTime,
    this.isOpenToday = true,
    required this.createdAt,
  });

  String get effectiveOperatingHours {
    if (operatingHours != null && operatingHours!.trim().isNotEmpty) {
      return operatingHours!.trim();
    }
    if (openingTime != null && closingTime != null && openingTime!.isNotEmpty && closingTime!.isNotEmpty) {
      return '$openingTime - $closingTime';
    }
    return '6:00 AM - 9:00 PM';
  }

  String get effectiveOpeningTime => (openingTime != null && openingTime!.isNotEmpty) ? openingTime! : '6:00 AM';
  String get effectiveClosingTime => (closingTime != null && closingTime!.isNotEmpty) ? closingTime! : '9:00 PM';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedCreatedAt = DateTime.now();
    if (json['createdAt'] != null) {
      final raw = json['createdAt'];
      if (raw is DateTime) {
        parsedCreatedAt = raw;
      } else {
        try {
          if (raw.runtimeType.toString() == 'Timestamp' || raw.toString().contains('Timestamp')) {
            try {
              parsedCreatedAt = (raw as dynamic).toDate();
            } catch (_) {
              parsedCreatedAt = DateTime.tryParse(raw.toString()) ?? DateTime.now();
            }
          } else {
            parsedCreatedAt = DateTime.tryParse(raw.toString()) ?? DateTime.now();
          }
        } catch (_) {
          parsedCreatedAt = DateTime.now();
        }
      }
    }

    List<String>? parsedAreas;
    if (json['deliveryAreas'] != null) {
      if (json['deliveryAreas'] is List) {
        parsedAreas = (json['deliveryAreas'] as List).map((e) => e.toString()).toList();
      } else if (json['deliveryAreas'] is String) {
        parsedAreas = (json['deliveryAreas'] as String)
            .split(',')
            .map((e) => e.trim())
            .where((e) => e.isNotEmpty)
            .toList();
      }
    }

    return UserModel(
      uid: json['uid']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      role: json['role']?.toString() ?? 'customer',
      profileImage: (json['profileImage'] ?? json['logo'] ?? json['image'])?.toString(),
      address: json['address']?.toString(),
      city: json['city']?.toString(),
      deliveryAreas: parsedAreas,
      gstNumber: json['gstNumber']?.toString(),
      operatingHours: json['operatingHours']?.toString(),
      openingTime: json['openingTime']?.toString(),
      closingTime: json['closingTime']?.toString(),
      isOpenToday: json['isOpenToday'] is bool ? json['isOpenToday'] : true,
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uid': uid,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'profileImage': profileImage,
      'address': address,
      'city': city,
      'deliveryAreas': deliveryAreas,
      'gstNumber': gstNumber,
      'operatingHours': operatingHours ?? effectiveOperatingHours,
      'openingTime': openingTime ?? effectiveOpeningTime,
      'closingTime': closingTime ?? effectiveClosingTime,
      'isOpenToday': isOpenToday,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
