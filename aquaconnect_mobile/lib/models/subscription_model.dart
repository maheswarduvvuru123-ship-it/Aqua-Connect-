class SubscriptionModel {
  final String id;
  final String customerId;
  final String customerName;
  final String productName;
  final int quantity;
  final String frequency; // 'Every Day' | 'Every 2 Days' | 'Every 3 Days' | 'Every 5 Days' | 'Weekly (Every 7 Days)'
  final int intervalDays; // 1, 2, 3, 5, 7, etc.
  final String deliverySlot;
  final String address;
  final String? supplierId;
  final String? plantName;
  bool isActive;
  final String nextDeliveryDate;

  SubscriptionModel({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.productName,
    required this.quantity,
    required this.frequency,
    this.intervalDays = 2,
    required this.deliverySlot,
    required this.address,
    this.supplierId,
    this.plantName,
    required this.isActive,
    required this.nextDeliveryDate,
  });

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    int days = (json['intervalDays'] as num?)?.toInt() ?? 2;
    String freq = json['frequency'] ?? 'Every 2 Days';
    if (json['intervalDays'] == null) {
      if (freq.contains('Daily') || freq.contains('1 Day') || freq.contains('Every Day')) {
        days = 1;
      } else if (freq.contains('2 Days') || freq.contains('Alternate')) {
        days = 2;
      } else if (freq.contains('3 Days')) {
        days = 3;
      } else if (freq.contains('4 Days')) {
        days = 4;
      } else if (freq.contains('5 Days')) {
        days = 5;
      } else if (freq.contains('Weekly') || freq.contains('7 Days')) {
        days = 7;
      }
    }

    return SubscriptionModel(
      id: json['id'] ?? '',
      customerId: json['customerId'] ?? '',
      customerName: json['customerName'] ?? '',
      productName: json['productName'] ?? '20L Water Can',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      frequency: freq,
      intervalDays: days,
      deliverySlot: json['deliverySlot'] ?? 'Morning (07:00 AM - 10:00 AM)',
      address: json['address'] ?? '',
      supplierId: json['supplierId'],
      plantName: json['plantName'],
      isActive: json['isActive'] ?? true,
      nextDeliveryDate: json['nextDeliveryDate'] ?? 'Tomorrow, 07:30 AM',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerId': customerId,
      'customerName': customerName,
      'productName': productName,
      'quantity': quantity,
      'frequency': frequency,
      'intervalDays': intervalDays,
      'deliverySlot': deliverySlot,
      'address': address,
      'supplierId': supplierId,
      'plantName': plantName,
      'isActive': isActive,
      'nextDeliveryDate': nextDeliveryDate,
    };
  }
}
