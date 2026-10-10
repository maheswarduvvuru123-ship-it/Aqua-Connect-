class OrderItem {
  final String productId;
  final String name;
  final int quantity;
  final double price;
  final String? unit;

  OrderItem({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.price,
    this.unit,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'] ?? '',
      name: json['name'] ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'name': name,
      'quantity': quantity,
      'price': price,
      'unit': unit,
    };
  }
}

class OrderModel {
  final String orderId;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String supplierId;
  final String? plantName;
  final List<OrderItem> items;
  final double totalAmount;
  final String deliveryAddress;
  final String deliveryDate;
  final String deliveryTime;
  final String? deliveryPerson;
  final String paymentMethod;
  final String paymentStatus;
  final String orderStatus;
  final int emptyCansReturned;
  final DateTime createdAt;

  OrderModel({
    required this.orderId,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.supplierId,
    this.plantName,
    required this.items,
    required this.totalAmount,
    required this.deliveryAddress,
    required this.deliveryDate,
    required this.deliveryTime,
    this.deliveryPerson,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.orderStatus,
    this.emptyCansReturned = 0,
    required this.createdAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    List<OrderItem> itemList = [];
    if (json['items'] is List) {
      for (var i in (json['items'] as List)) {
        if (i is Map) {
          try {
            itemList.add(OrderItem.fromJson(Map<String, dynamic>.from(i)));
          } catch (_) {}
        }
      }
    }

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

    return OrderModel(
      orderId: json['orderId']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? '',
      customerName: json['customerName']?.toString() ?? '',
      customerPhone: json['customerPhone']?.toString() ?? '',
      supplierId: json['supplierId']?.toString() ?? '',
      plantName: (json['plantName'] ?? json['supplierName'])?.toString(),
      items: itemList,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      deliveryAddress: json['deliveryAddress']?.toString() ?? '',
      deliveryDate: json['deliveryDate']?.toString() ?? '',
      deliveryTime: json['deliveryTime']?.toString() ?? '',
      deliveryPerson: json['deliveryPerson']?.toString(),
      paymentMethod: json['paymentMethod']?.toString() ?? 'Cash on Delivery',
      paymentStatus: json['paymentStatus']?.toString() ?? 'Pending',
      orderStatus: json['orderStatus']?.toString() ?? 'Pending',
      emptyCansReturned: (json['emptyCansReturned'] as num?)?.toInt() ?? 0,
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'orderId': orderId,
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'supplierId': supplierId,
      'plantName': plantName,
      'items': items.map((i) => i.toJson()).toList(),
      'totalAmount': totalAmount,
      'deliveryAddress': deliveryAddress,
      'deliveryDate': deliveryDate,
      'deliveryTime': deliveryTime,
      'deliveryPerson': deliveryPerson,
      'paymentMethod': paymentMethod,
      'paymentStatus': paymentStatus,
      'orderStatus': orderStatus,
      'emptyCansReturned': emptyCansReturned,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
