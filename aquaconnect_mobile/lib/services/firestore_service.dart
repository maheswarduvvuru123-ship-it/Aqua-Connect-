import '../models/product_model.dart';
import '../models/order_model.dart';

class FirestoreService {
  // Pre-configured mock data matching backend specs
  static List<ProductModel> getProducts() {
    return [
      ProductModel(
        productId: 'prod_001',
        supplierId: 'sup_001',
        name: '20L Normal Water Can',
        description: 'Standard 20 Litre purified RO+UV mineral water in returnable plastic can.',
        price: 50.0,
        image: 'assets/images/bubble_top_can.jpg',
        stock: 85,
        unit: '20L',
        containerType: 'Returnable Jar',
      ),
      ProductModel(
        productId: 'prod_002',
        supplierId: 'sup_001',
        name: '20L Cool / Chilled Water Can',
        description: 'Chilled 20 Litre purified mineral water insulated camper can with tap.',
        price: 65.0,
        image: 'assets/images/cool_water_can.jpg',
        stock: 50,
        unit: '20L Chilled',
        containerType: 'Returnable Jar',
      ),
      ProductModel(
        productId: 'prod_003',
        supplierId: 'sup_001',
        name: 'Drinking Water Packets (50 Pouches)',
        description: 'Bundle of 50 hygienic 250ml sealed drinking water pouches.',
        price: 75.0,
        image: 'assets/images/water_pouches_pack.jpg',
        stock: 60,
        unit: '250ml x 50',
        containerType: 'Water Packet',
      ),
      ProductModel(
        productId: 'prod_004',
        supplierId: 'sup_001',
        name: '1L Water Bottles (Box of 12)',
        description: 'Carton of twelve 1 Litre packaged natural mineral water plastic bottles.',
        price: 180.0,
        image: 'assets/images/bottled_water_pack.jpg',
        stock: 45,
        unit: '1L x 12',
        containerType: 'Packaged Box',
      ),
    ];
  }

  static List<OrderModel> getSampleOrders() {
    return [];
  }
}
