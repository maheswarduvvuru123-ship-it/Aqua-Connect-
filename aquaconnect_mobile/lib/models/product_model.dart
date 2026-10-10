class ProductModel {
  final String productId;
  final String supplierId;
  final String name;
  final String description;
  final double price;
  final String image;
  final int stock;
  final String unit;
  final String containerType;
  final bool isActive;

  ProductModel({
    required this.productId,
    required this.supplierId,
    required this.name,
    required this.description,
    required this.price,
    required this.image,
    required this.stock,
    required this.unit,
    required this.containerType,
    this.isActive = true,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      productId: json['productId'] ?? '',
      supplierId: json['supplierId'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      image: json['image'] ?? '',
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      unit: json['unit'] ?? '',
      containerType: json['containerType'] ?? 'Returnable Jar',
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'supplierId': supplierId,
      'name': name,
      'description': description,
      'price': price,
      'image': image,
      'stock': stock,
      'unit': unit,
      'containerType': containerType,
      'isActive': isActive,
    };
  }
}
