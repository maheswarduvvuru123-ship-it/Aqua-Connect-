class DriverModel {
  final String id;
  final String name;
  final String phone;
  final String vehicleNumber;
  final String vehicleType;
  int activeOrdersCount;
  int cansCapacity;
  int cansLoaded;
  String status; // 'On Route' | 'Available' | 'Offline'

  DriverModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.vehicleNumber,
    required this.vehicleType,
    required this.activeOrdersCount,
    required this.cansCapacity,
    required this.cansLoaded,
    required this.status,
  });

  factory DriverModel.fromJson(Map<String, dynamic> json) {
    return DriverModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      vehicleNumber: json['vehicleNumber'] ?? '',
      vehicleType: json['vehicleType'] ?? '',
      activeOrdersCount: (json['activeOrdersCount'] as num?)?.toInt() ?? 0,
      cansCapacity: (json['cansCapacity'] as num?)?.toInt() ?? 50,
      cansLoaded: (json['cansLoaded'] as num?)?.toInt() ?? 0,
      status: json['status'] ?? 'Available',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'vehicleNumber': vehicleNumber,
      'vehicleType': vehicleType,
      'activeOrdersCount': activeOrdersCount,
      'cansCapacity': cansCapacity,
      'cansLoaded': cansLoaded,
      'status': status,
    };
  }
}
