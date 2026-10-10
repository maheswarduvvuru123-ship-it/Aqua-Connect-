import 'package:flutter/material.dart';
import '../models/product_model.dart';

class CartProvider extends ChangeNotifier {
  final Map<String, int> _items = {};

  Map<String, int> get items => _items;

  int get totalCount => _items.values.fold(0, (sum, count) => sum + count);

  void addItem(String productId, int quantity) {
    if (_items.containsKey(productId)) {
      _items[productId] = _items[productId]! + quantity;
    } else {
      _items[productId] = quantity;
    }
    notifyListeners();
  }

  void updateQuantity(String productId, int delta) {
    if (!_items.containsKey(productId)) return;
    int current = _items[productId]! + delta;
    if (current <= 0) {
      _items.remove(productId);
    } else {
      _items[productId] = current;
    }
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  double calculateSubtotal(List<ProductModel> products) {
    double total = 0.0;
    _items.forEach((productId, qty) {
      final p = products.firstWhere((prod) => prod.productId == productId, orElse: () => products.first);
      total += p.price * qty;
    });
    return total;
  }
}
