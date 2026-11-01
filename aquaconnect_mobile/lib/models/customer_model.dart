class CustomerModel {
  final String id;
  final String name;
  final String phone;
  final String email;
  final String address;
  final String type; // 'Residential' | 'Commercial' | 'Corporate'
  int cansHeld;
  double depositHeld;
  double duesAmount;
  int totalOrdersCount;
  int totalCansDelivered;
  int totalCansReturned;

  CustomerModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.address,
    this.type = 'Residential',
    this.cansHeld = 0,
    this.depositHeld = 0.0,
    this.duesAmount = 0.0,
    this.totalOrdersCount = 0,
    this.totalCansDelivered = 0,
    this.totalCansReturned = 0,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      address: json['address'] ?? '',
      type: json['type'] ?? 'Residential',
      cansHeld: (json['cansHeld'] as num?)?.toInt() ?? 0,
      depositHeld: (json['depositHeld'] as num?)?.toDouble() ?? 0.0,
      duesAmount: (json['duesAmount'] as num?)?.toDouble() ?? 0.0,
      totalOrdersCount: (json['totalOrdersCount'] as num?)?.toInt() ?? 0,
      totalCansDelivered: (json['totalCansDelivered'] as num?)?.toInt() ?? 0,
      totalCansReturned: (json['totalCansReturned'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'address': address,
      'type': type,
      'cansHeld': cansHeld,
      'depositHeld': depositHeld,
      'duesAmount': duesAmount,
      'totalOrdersCount': totalOrdersCount,
      'totalCansDelivered': totalCansDelivered,
      'totalCansReturned': totalCansReturned,
    };
  }
}
