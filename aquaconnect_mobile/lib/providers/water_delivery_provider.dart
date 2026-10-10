import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/product_model.dart';
import '../models/order_model.dart';
import '../models/customer_model.dart';
import '../models/driver_model.dart';
import '../models/subscription_model.dart';
import '../models/can_transaction_model.dart';
import '../models/user_model.dart';

class WaterDeliveryProvider extends ChangeNotifier {
  // 1. Products Catalog (Live products loaded from Firestore or dynamically mapped to registered suppliers)
  final List<ProductModel> _products = [];

  // 2. Orders
  final List<OrderModel> _orders = [];

  // 3. Customers
  final List<CustomerModel> _customers = [];

  // 4. Fleet / Drivers
  final List<DriverModel> _drivers = [];

  // 5. Subscriptions
  final List<SubscriptionModel> _subscriptions = [];

  // 6. Can Ledger Transactions
  final List<CanTransactionModel> _canTransactions = [];

  // 7. Active Registered Suppliers (Loaded exclusively from registered Firestore accounts)
  final List<UserModel> _suppliers = [];

  // 8. Sales Report Reset Timestamp (Ensures when reports are reset to ₹0, they strictly display 0)
  DateTime? _salesResetAfter;

  /// Validate supplier name to remove dummy data ("s", "hs", "h", "hn", test, dummy, etc.) and email accounts
  static bool isValidSupplierName(String name, [String? email, String? phone]) {
    final clean = name.trim().toLowerCase();
    if (clean.length < 3) return false;

    // Reject any raw email account used as plant/user name
    if (clean.contains('@')) return false;

    // Reject deleted testing email accounts explicitly (Paddu, Jaya)
    if (clean.contains('paddu') || clean.contains('jaya')) return false;

    // Strict blacklist of dummy/test names
    const dummyNames = {
      's', 'hs', 'h', 'hn', 'sh', 'hh', 'ss', 'hnn', 'hns', 'test', 'dummy',
      'asdf', 'xyz', 'demo', 'plant', 'supplier', 'water supplier', 'water plant',
      'test supplier', 'demo supplier', 'fake', 'sample', 'null', 'undefined',
      'abc', 'qwerty', 'admin', 'user', 'testing', 'tester', 'trial', 'temp',
      'paddu', 'jaya', 'paddus', 'jayas',
      "paddu's aqua services", "jaya's aqua services",
      'paddus aqua services', 'jayas aqua services',
    };
    if (dummyNames.contains(clean)) return false;

    // Reject names ending with 'aqua services' if the prefix is a personal/test handle
    if (clean.endsWith('aqua services') || clean.endsWith("'s aqua services")) {
      final prefix = clean.replaceAll("'s aqua services", "").replaceAll(" aqua services", "").trim();
      if (dummyNames.contains(prefix) || prefix == 'paddu' || prefix == 'jaya') {
        return false;
      }
    }

    // Strict rejection of any name containing dummy words
    if (clean.contains('test') ||
        clean.contains('dummy') ||
        clean.contains('demo') ||
        clean.contains('fake') ||
        clean.contains('sample') ||
        clean.contains('trial') ||
        clean.contains('temp')) {
      return false;
    }

    // Check dummy email prefix if email provided
    if (email != null && email.isNotEmpty) {
      final cleanEmail = email.trim().toLowerCase();
      if (cleanEmail.contains('paddu') || cleanEmail.contains('jaya') || cleanEmail.contains('test')) return false;
      final prefix = cleanEmail.split('@').first;
      if (dummyNames.contains(prefix) || prefix == 'paddu' || prefix == 'jaya') return false;
      if (prefix.length < 3 && RegExp(r'^[a-z]+$').hasMatch(prefix)) return false;
    }

    // Reject names containing mock placeholders
    if (clean.contains('sri krishna') ||
        clean.contains('aquapure') ||
        clean.contains('ganga blue')) {
      return false;
    }

    // Must contain at least 3 alphabetic letters
    final letterCount = RegExp(r'[a-zA-Z]').allMatches(clean).length;
    if (letterCount < 3) return false;

    // Reject repetitive single/double char junk like "hhhh", "ssss", "hshs", "hnhn"
    final uniqueLetters = clean.replaceAll(RegExp(r'[^a-z]'), '').split('').toSet();
    if (uniqueLetters.length == 1) return false; // e.g. "ssss", "hhhh"
    if (uniqueLetters.length == 2) {
      final onlyDummyChars = clean.replaceAll(RegExp(r'[^a-z]'), '').split('').every((c) => c == 'h' || c == 's' || c == 'n');
      if (onlyDummyChars) return false; // e.g. "hs", "hshs", "hnhn", "hsn"
    }

    return true;
  }

  /// Check if an order is associated with deleted testing plants or invalid dummy records
  static bool isEmailAccountOrder(OrderModel order) {
    final pName = (order.plantName ?? '').trim().toLowerCase();
    final sId = order.supplierId.trim().toLowerCase();

    // Only exclude orders where plant name is an invalid dummy email plant
    if (pName.contains('@') || pName.contains("paddu's aqua") || pName.contains("jaya's aqua") || sId.startsWith('sup_000')) {
      return true;
    }
    return false;
  }

  /// Sanitize human or customer name so raw email accounts are formatted nicely
  static String sanitizeName(String? raw, {String fallback = 'Customer'}) {
    if (raw == null || raw.trim().isEmpty) return fallback;
    final clean = raw.trim();
    if (clean.contains('@')) {
      final prefix = clean.split('@').first.replaceAll(RegExp(r'[^a-zA-Z0-9 ]'), ' ').trim();
      if (prefix.isEmpty) return fallback;
      return prefix.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' ').trim();
    }
    return clean;
  }

  /// Resolve registered customer name for orders accurately
  String getOrderCustomerDisplayName(OrderModel order) {
    // 1. Order customerName if clean and valid
    final rawName = order.customerName.trim();
    if (rawName.isNotEmpty && rawName.toLowerCase() != 'customer' && !rawName.contains('@')) {
      return rawName;
    }

    // 2. Look up customer in _customers collection
    final custMatch = _customers.where((c) =>
      c.id == order.customerId ||
      (c.email.isNotEmpty && c.email.toLowerCase() == order.customerId.toLowerCase())
    ).toList();
    if (custMatch.isNotEmpty) {
      final cName = custMatch.first.name.trim();
      if (cName.isNotEmpty && cName.toLowerCase() != 'customer' && !cName.contains('@')) {
        return cName;
      }
    }

    // 3. If rawName has @, parse it cleanly
    if (rawName.contains('@')) {
      final prefix = rawName.split('@').first.replaceAll(RegExp(r'[^a-zA-Z0-9 ]'), ' ').trim();
      if (prefix.isNotEmpty) {
        return prefix.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' ').trim();
      }
    }

    if (order.customerId.contains('@')) {
      final prefix = order.customerId.split('@').first.replaceAll(RegExp(r'[^a-zA-Z0-9 ]'), ' ').trim();
      if (prefix.isNotEmpty) {
        return prefix.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' ').trim();
      }
    }

    return rawName.isNotEmpty ? rawName : 'Registered Customer';
  }

  /// Sanitize water plant name so email handles and deleted testing plants are never shown
  static String sanitizePlantName(String? raw) {
    if (raw == null || raw.trim().isEmpty) return 'AquaConnect Certified Water Plant';
    final clean = raw.trim();
    if (clean.toLowerCase().contains('paddu') ||
        clean.toLowerCase().contains('jaya') ||
        clean.contains('@') ||
        !isValidSupplierName(clean)) {
      return 'AquaConnect Certified Water Plant';
    }
    return clean;
  }

  /// Add or update a supplier ensuring NO duplicate / repeated entries
  void _addOrUpdateSupplier(UserModel s) {
    if (!isValidSupplierName(s.name, s.email, s.phone)) return;
    if (s.uid.startsWith('sup_00')) return;

    final cleanEmail = s.email.trim().toLowerCase();
    final cleanPhone = s.phone.replaceAll(RegExp(r'\D'), '');
    final cleanName = s.name.trim().toLowerCase();

    final idx = _suppliers.indexWhere((existing) {
      if (existing.uid == s.uid) return true;
      if (cleanEmail.isNotEmpty && existing.email.trim().toLowerCase() == cleanEmail) return true;
      if (cleanPhone.isNotEmpty && existing.phone.replaceAll(RegExp(r'\D'), '') == cleanPhone) return true;
      if (cleanName.isNotEmpty && existing.name.trim().toLowerCase() == cleanName) return true;
      return false;
    });

    if (idx != -1) {
      final old = _suppliers[idx];
      _suppliers[idx] = UserModel(
        uid: s.uid.isNotEmpty ? s.uid : old.uid,
        name: s.name.isNotEmpty ? s.name : old.name,
        email: cleanEmail.isNotEmpty ? cleanEmail : old.email,
        phone: s.phone.isNotEmpty ? s.phone : old.phone,
        role: 'supplier',
        profileImage: (s.profileImage != null && s.profileImage!.isNotEmpty && !s.profileImage!.contains('1544816155-12df9643f363'))
            ? s.profileImage
            : ((old.profileImage != null && !old.profileImage!.contains('1544816155-12df9643f363')) ? old.profileImage : null),
        address: (s.address != null && s.address!.isNotEmpty) ? s.address : old.address,
        city: (s.city != null && s.city!.isNotEmpty) ? s.city : old.city,
        deliveryAreas: (s.deliveryAreas != null && s.deliveryAreas!.isNotEmpty) ? s.deliveryAreas : old.deliveryAreas,
        gstNumber: (s.gstNumber != null && s.gstNumber!.isNotEmpty) ? s.gstNumber : old.gstNumber,
        operatingHours: s.operatingHours ?? old.operatingHours,
        openingTime: s.openingTime ?? old.openingTime,
        closingTime: s.closingTime ?? old.closingTime,
        isOpenToday: s.isOpenToday,
        createdAt: old.createdAt,
      );
    } else {
      _suppliers.add(s);
    }
  }

  /// Default product catalog templates created for registered suppliers who have not yet configured custom products
  List<ProductModel> _generateDefaultProductsForSupplier(String supplierId) {
    return [
      ProductModel(
        productId: 'prod_${supplierId}_norm',
        supplierId: supplierId,
        name: '20L Normal RO Water Can',
        description: 'Standard 20 Litre room temperature purified RO+UV mineral water in returnable plastic can.',
        price: 50.0,
        image: 'https://5.imimg.com/data5/AP/MU/MY-4515526/20-litre-can-jug-jar-dispenser-500x500.jpg',
        stock: 100,
        unit: '20L Can',
        containerType: 'Returnable Jar',
      ),
      ProductModel(
        productId: 'prod_${supplierId}_cool',
        supplierId: supplierId,
        name: '20L Cool / Chilled Water Can',
        description: 'Freshly chilled 20 Litre purified mineral water insulated camper can with tap for summer and events.',
        price: 65.0,
        image: 'https://5.imimg.com/data5/SELLER/Default/2021/4/AM/HZ/GJ/35689307/20ltres-cool-can-1--500x500.jpeg',
        stock: 60,
        unit: '20L Chilled',
        containerType: 'Returnable Jar',
      ),
      ProductModel(
        productId: 'prod_${supplierId}_bot',
        supplierId: supplierId,
        name: '1L Water Bottles (Box of 12)',
        description: 'Carton of twelve 1 Litre packaged natural mineral water plastic bottles with tamper seal.',
        price: 180.0,
        image: 'https://5.imimg.com/data5/SELLER/Default/2022/11/NF/WB/JJ/45711328/1-litre-packed-drinking-water-bottle-500x500.jpg',
        stock: 50,
        unit: '1L x 12',
        containerType: 'Packaged Box',
      ),
      ProductModel(
        productId: 'prod_${supplierId}_pkt',
        supplierId: supplierId,
        name: 'Drinking Water Packets (50 Pouches)',
        description: 'Bundle of 50 hygienic 250ml sealed drinking water pouches for pooja, catering & gatherings.',
        price: 75.0,
        image: 'https://5.imimg.com/data5/SELLER/Default/2024/3/401402931/HR/MG/JG/11262634/ldpe-packed-drinking-water-pouch-500x500.jpg',
        stock: 80,
        unit: '250ml x 50',
        containerType: 'Water Packet',
      ),
      ProductModel(
        productId: 'prod_${supplierId}_tap',
        supplierId: supplierId,
        name: 'Manual Can Water Dispenser Tap',
        description: 'Food-grade easy press manual water pump tap for 20L cans.',
        price: 120.0,
        image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=80',
        stock: 30,
        unit: '1 Unit',
        containerType: 'Accessory',
      ),
    ];
  }

  // Overall Can Inventory Tracking
  int totalCansOwned = 0;
  int filledInPlant = 0;
  int emptyInPlant = 0;
  int circulatingWithCustomers = 0;
  int damagedCans = 0;

  WaterDeliveryProvider() {
    initFirestoreListeners();
  }

  // Getters
  List<ProductModel> get products {
    if (_products.isNotEmpty) return _products;
    if (_suppliers.isNotEmpty) {
      return _generateDefaultProductsForSupplier(_suppliers.first.uid);
    }
    return _generateDefaultProductsForSupplier('supplier');
  }
  List<OrderModel> get orders => _orders;
  List<CustomerModel> get customers => _customers;
  List<DriverModel> get drivers => _drivers;
  List<SubscriptionModel> get subscriptions => _subscriptions;
  List<CanTransactionModel> get canTransactions => _canTransactions;
  List<UserModel> get suppliers {
    final list = <UserModel>[];
    final seen = <String>{};
    for (final s in _suppliers) {
      if (!isValidSupplierName(s.name, s.email, s.phone)) continue;
      final cleanName = s.name.trim().toLowerCase();
      if (seen.contains(cleanName)) continue;
      seen.add(cleanName);
      list.add(s);
    }
    return list;
  }

  // Supplier Metrics
  int get todayOrdersCount => _orders.where((o) => o.deliveryDate == 'Today' && (_salesResetAfter == null || o.createdAt.isAfter(_salesResetAfter!))).length;
  double get todayRevenue => _orders
      .where((o) => o.deliveryDate == 'Today' && o.orderStatus != 'Cancelled' && (_salesResetAfter == null || o.createdAt.isAfter(_salesResetAfter!)))
      .fold(0.0, (acc, o) => acc + o.totalAmount);
  int get pendingOrdersCount => _orders.where((o) => (o.orderStatus == 'Pending' || o.orderStatus == 'Confirmed') && (_salesResetAfter == null || o.createdAt.isAfter(_salesResetAfter!))).length;
  int get activeDeliveriesCount => _orders.where((o) => o.orderStatus == 'Out for Delivery' && (_salesResetAfter == null || o.createdAt.isAfter(_salesResetAfter!))).length;
  int get outForDeliveryCount => activeDeliveriesCount;
  double get pendingDues => _customers.fold(0.0, (acc, c) => acc + c.duesAmount);

  /// Listen to live Firestore data and sync suppliers, customers, products, and orders
  /// Purge lingering test accounts and test email orders from Firestore
  Future<void> purgeTestingEmailAccountsAndOrders() async {
    try {
      // 1. Purge orders with email accounts or testing handles
      final orderSnap = await FirebaseFirestore.instance.collection('orders').get();
      for (var doc in orderSnap.docs) {
        try {
          final order = OrderModel.fromJson(doc.data());
          if (isEmailAccountOrder(order)) {
            await FirebaseFirestore.instance.collection('orders').doc(doc.id).delete();
          }
        } catch (_) {}
      }

      // 2. Purge suppliers associated with testing email accounts (Paddu, Jaya)
      final supSnap = await FirebaseFirestore.instance.collection('suppliers').get();
      for (var doc in supSnap.docs) {
        final d = doc.data();
        final name = (d['businessName'] ?? d['ownerName'] ?? d['name'] ?? '').toString();
        final email = (d['email'] ?? '').toString();
        if (name.toLowerCase().contains('paddu') ||
            name.toLowerCase().contains('jaya') ||
            email.toLowerCase().contains('paddu') ||
            email.toLowerCase().contains('jaya') ||
            name.contains('@') ||
            !isValidSupplierName(name, email)) {
          await FirebaseFirestore.instance.collection('suppliers').doc(doc.id).delete();
        }
      }

      // 3. Only purge dummy supplier plants, NEVER customer accounts!
      final supSnap2 = await FirebaseFirestore.instance.collection('suppliers').get();
      for (var doc in supSnap2.docs) {
        final d = doc.data();
        final name = (d['businessName'] ?? d['name'] ?? '').toString().toLowerCase();
        if (name.contains("paddu's aqua") || name.contains("jaya's aqua")) {
          await FirebaseFirestore.instance.collection('suppliers').doc(doc.id).delete();
        }
      }
    } catch (e) {
      debugPrint('Firestore purge error: $e');
    }
  }

  void initFirestoreListeners() {
    try {
      // Run automatic purge of deleted testing accounts and email orders from Firestore
      purgeTestingEmailAccountsAndOrders();

      // 1. Listen to suppliers in users collection (Strictly clear so deleted testing accounts never linger)
      FirebaseFirestore.instance.collection('users').snapshots().listen((snap) {
        _suppliers.clear();
        for (var doc in snap.docs) {
          final data = doc.data();
          final name = (data['name'] ?? '').toString().toLowerCase();
          final bName = (data['businessName'] ?? '').toString().toLowerCase();

          // Only skip dummy plant names from supplier feed, never delete user account!
          if (name.contains("paddu's aqua") || name.contains("jaya's aqua") ||
              bName.contains("paddu's aqua") || bName.contains("jaya's aqua")) {
            FirebaseFirestore.instance.collection('suppliers').doc(doc.id).delete().catchError((_) {});
            continue;
          }

          final role = data['role']?.toString().toLowerCase();
          if (role == 'supplier') {
            try {
              final s = UserModel.fromJson(data);
              _addOrUpdateSupplier(s);
            } catch (e) {
              debugPrint('Supplier parse error: $e');
            }
          }
        }
        notifyListeners();
      }, onError: (err) {
        debugPrint('Firestore users suppliers listener error: $err');
      });

      // Also listen to dedicated suppliers collection, but only for active registered accounts
      FirebaseFirestore.instance.collection('suppliers').snapshots().listen((snap) {
        for (var doc in snap.docs) {
          final data = doc.data();
          final uid = data['supplierId']?.toString() ?? data['uid']?.toString() ?? doc.id;
          final name = data['businessName']?.toString() ?? data['ownerName']?.toString() ?? data['name']?.toString() ?? '';
          final email = data['email']?.toString() ?? '';

          // If deleted testing email account, purge from Firestore suppliers
          if (name.toLowerCase().contains('paddu') || name.toLowerCase().contains('jaya') ||
              email.toLowerCase().contains('paddu') || email.toLowerCase().contains('jaya') ||
              name.contains('@') || !isValidSupplierName(name, email, data['phone']?.toString())) {
            FirebaseFirestore.instance.collection('suppliers').doc(doc.id).delete().catchError((_) {});
            continue;
          }
          if (uid.startsWith('sup_00')) continue;

          // Only augment active suppliers that exist in registered users
          if (_suppliers.any((u) => u.uid == uid || (u.email.isNotEmpty && u.email.toLowerCase() == (data['email']?.toString().toLowerCase() ?? '')))) {
            final sModel = UserModel(
              uid: uid,
              name: sanitizePlantName(name),
              email: data['email']?.toString() ?? '',
              phone: data['phone']?.toString() ?? '',
              role: 'supplier',
              profileImage: (data['profileImage'] ?? data['logo'] ?? data['image'])?.toString(),
              address: data['address']?.toString() ?? '',
              deliveryAreas: (data['deliveryAreas'] is List)
                  ? (data['deliveryAreas'] as List).map((e) => e.toString()).toList()
                  : (data['deliveryAreas'] is String
                      ? (data['deliveryAreas'] as String).split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList()
                      : null),
              createdAt: DateTime.now(),
            );
            _addOrUpdateSupplier(sModel);
          }
        }
        notifyListeners();
      }, onError: (err) {
        debugPrint('Firestore suppliers collection listener error: $err');
      });

      // Listen to subscriptions collection
      FirebaseFirestore.instance.collection('subscriptions').snapshots().listen((snap) {
        if (snap.docs.isNotEmpty) {
          _subscriptions.clear();
          for (var doc in snap.docs) {
            try {
              _subscriptions.add(SubscriptionModel.fromJson(doc.data()));
            } catch (e) {
              debugPrint('Subscription parse error: $e');
            }
          }
          notifyListeners();
        }
      }, onError: (err) {
        debugPrint('Firestore subscriptions listener error: $err');
      });

      // 2. Listen to customers collection
      FirebaseFirestore.instance.collection('customers').snapshots().listen((snap) {
        _customers.clear();
        for (var doc in snap.docs) {
          final data = doc.data();
          final id = data['customerId']?.toString() ?? data['userId']?.toString() ?? doc.id;
          final name = data['name']?.toString() ?? 'Customer';
          final phone = data['phone']?.toString() ?? '';
          final address = data['address']?.toString() ?? '';
          final email = data['email']?.toString() ?? '';
          final dues = (data['pendingPayment'] as num?)?.toDouble() ?? (data['duesAmount'] as num?)?.toDouble() ?? 0.0;
          final totalOrders = (data['totalOrders'] as num?)?.toInt() ?? (data['totalOrdersCount'] as num?)?.toInt() ?? 0;

          _customers.add(CustomerModel(
            id: id,
            name: name,
            phone: phone,
            email: email,
            address: address,
            type: 'Residential',
            cansHeld: 0,
            depositHeld: 0.0,
            duesAmount: dues,
            totalOrdersCount: totalOrders,
            totalCansDelivered: 0,
            totalCansReturned: 0,
          ));
        }
        notifyListeners();
      }, onError: (err) {
        debugPrint('Firestore customers listener error: $err');
      });

      // 3. Also listen to users collection where role is customer
      FirebaseFirestore.instance.collection('users').where('role', isEqualTo: 'customer').snapshots().listen((snap) {
        for (var doc in snap.docs) {
          final data = doc.data();
          final uid = data['uid']?.toString() ?? doc.id;
          final name = data['name']?.toString() ?? '';
          final phone = data['phone']?.toString() ?? '';
          final address = data['address']?.toString() ?? '';
          final email = data['email']?.toString() ?? '';

          final existingIdx = _customers.indexWhere((c) => c.id == uid || (email.isNotEmpty && c.email == email));
          if (existingIdx != -1) {
            final old = _customers[existingIdx];
            _customers[existingIdx] = CustomerModel(
              id: uid,
              name: name.isNotEmpty ? name : old.name,
              phone: phone.isNotEmpty ? phone : old.phone,
              email: email.isNotEmpty ? email : old.email,
              address: address.isNotEmpty ? address : old.address,
              type: old.type,
              cansHeld: old.cansHeld,
              depositHeld: old.depositHeld,
              duesAmount: old.duesAmount,
              totalOrdersCount: old.totalOrdersCount,
              totalCansDelivered: old.totalCansDelivered,
              totalCansReturned: old.totalCansReturned,
            );
          } else {
            _customers.add(CustomerModel(
              id: uid,
              name: name.isNotEmpty ? name : email.split('@').first,
              phone: phone,
              email: email,
              address: address,
              type: 'Residential',
              cansHeld: 0,
              depositHeld: 0.0,
              duesAmount: 0.0,
              totalOrdersCount: 0,
              totalCansDelivered: 0,
              totalCansReturned: 0,
            ));
          }
        }
        notifyListeners();
      }, onError: (err) {
        debugPrint('Firestore users listener error: $err');
      });

      // 4. Listen to products collection
      FirebaseFirestore.instance.collection('products').snapshots().listen((snap) {
        _products.clear();
        for (var doc in snap.docs) {
          try {
            _products.add(ProductModel.fromJson(doc.data()));
          } catch (e) {
            debugPrint('Product parse error: $e');
          }
        }
        notifyListeners();
      }, onError: (err) {
        debugPrint('Firestore products listener error: $err');
      });

      // 5. Listen to orders collection
      FirebaseFirestore.instance.collection('orders').snapshots().listen((snap) {
        _orders.clear();
        for (var doc in snap.docs) {
          final data = doc.data();
          try {
            final order = OrderModel.fromJson(data);
            // Strictly exclude and purge email testing account orders from DB
            if (isEmailAccountOrder(order)) {
              FirebaseFirestore.instance.collection('orders').doc(doc.id).delete().catchError((_) {});
              continue;
            }
            if (_salesResetAfter != null && order.createdAt.isBefore(_salesResetAfter!)) {
              continue; // Exclude orders from before the reset timestamp!
            }
            _orders.add(order);
          } catch (e) {
            debugPrint('Order parse error: $e');
          }
        }
        _orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        _syncCanLedgerFromOrders();
        recalculateCans();
        notifyListeners();
      }, onError: (err) {
        debugPrint('Firestore orders listener error: $err');
      });
    } catch (e) {
      debugPrint('Firestore init error: $e');
    }
  }

  /// Location proximity score: higher score = closer match. 0 = no match / out of service area.
  static int calculateLocationScore({
    required String customerAddress,
    String? customerCity,
    required String supplierAddress,
    String? supplierCity,
    List<String>? deliveryAreas,
  }) {
    final custAddr = customerAddress.toLowerCase().trim();
    final suppAddr = supplierAddress.toLowerCase().trim();
    final custC = (customerCity ?? '').toLowerCase().trim();
    final suppC = (supplierCity ?? '').toLowerCase().trim();

    if (custAddr.isEmpty && suppAddr.isEmpty) return 0;

    int score = 0;

    // 0. Explicit custom delivery areas configured by supplier (e.g. Proddatur, Nandyal, Kottala, NH40)
    if (deliveryAreas != null && deliveryAreas.isNotEmpty) {
      for (final area in deliveryAreas) {
        final a = area.toLowerCase().trim();
        if (a.isNotEmpty) {
          if (custAddr.contains(a) || (custAddr.length >= 3 && a.contains(custAddr))) {
            score += 40; // High confidence match with supplier's declared service area
          }
        }
      }
    }

    if (custAddr.isEmpty || suppAddr.isEmpty) return score;

    // 1. PIN code matching (6-digit postal code)
    final pinRegex = RegExp(r'\b\d{6}\b');
    final custPins = pinRegex.allMatches(custAddr).map((m) => m.group(0)).toSet();
    final suppPins = pinRegex.allMatches(suppAddr).map((m) => m.group(0)).toSet();
    if (custPins.isNotEmpty && suppPins.isNotEmpty && custPins.intersection(suppPins).isNotEmpty) {
      score += 35; // Exact PIN code match
    }

    // 2. Direct substring match of address or locality
    if (custAddr.length > 3 && suppAddr.length > 3) {
      if (custAddr.contains(suppAddr) || suppAddr.contains(custAddr)) {
        score += 25;
      }
    }

    // 3. Regional Clusters (Town/mandal groupings to ensure proper geographical isolation)
    const regionalClusters = [
      // 0: Proddatur / Kadapa District Region
      {
        'proddatur', 'kottala', 'bollavaram', 'korrapadu', 'mydukur',
        'jammalamadugu', 'chagalamarri', 'kadapa', 'cuddapah', 'rajampet',
        'pulivendula', 'badvel', 'kamalapuram',
        '516360', '516361', '516362', '516001', '516002', '516003', '516004'
      },
      // 1: Nandyal District Region (Panyam, Balapanur, Banaganapalle, Allagadda, Betamcherla, NH40)
      {
        'nandyal', 'panyam', 'paniem', 'balapanur', 'banaganapalle', 'allagadda',
        'betamcherla', 'nh40', 'nandikotkur', 'atmakur', 'srisailam', 'koilkuntla',
        '518112', '518501', '518502', '518503', '518504', '518511'
      },
      // 2: Kurnool Region
      {
        'kurnool', 'dhone', 'alur', 'adoni', 'yemmiganur', 'pattikonda', 'kodumur',
        '518001', '518002', '518003', '518004'
      },
      // 3: Hyderabad / Cyberabad Region
      {
        'hyderabad', 'secunderabad', 'gachibowli', 'hitec city', 'whitefields',
        'kondapur', 'madhapur', 'kukatpally', 'jubilee hills', 'banjara hills',
        'manikonda', 'miyapur', 'lingampally', 'chandanagar', 'begumpet',
        'ameerpet', 'financial district', '500032', '500081', '500084'
      },
    ];

    // Combine supplier location info (address + city + deliveryAreas) for cluster analysis
    final allSuppTokens = <String>{};
    allSuppTokens.addAll(suppAddr.split(RegExp(r'[\s,./#\-_]+')).where((w) => w.length >= 3));
    if (suppC.isNotEmpty && suppC != 'hyderabad') allSuppTokens.add(suppC);
    if (deliveryAreas != null) {
      for (final a in deliveryAreas) {
        allSuppTokens.addAll(a.toLowerCase().split(RegExp(r'[\s,./#\-_]+')).where((w) => w.length >= 3));
      }
    }

    final custTokensRaw = custAddr.split(RegExp(r'[\s,./#\-_]+')).where((w) => w.length >= 3).toSet();
    if (custC.isNotEmpty) custTokensRaw.add(custC);

    // Identify regional cluster for customer and supplier
    int? custClusterIndex;
    int? suppClusterIndex;

    for (int i = 0; i < regionalClusters.length; i++) {
      final cluster = regionalClusters[i];
      if (custTokensRaw.any((t) => cluster.contains(t))) {
        custClusterIndex = i;
      }
      if (allSuppTokens.any((t) => cluster.contains(t))) {
        suppClusterIndex = i;
      }
    }

    // STRICT CROSS-CLUSTER ISOLATION:
    // If customer belongs to Cluster A and supplier belongs to Cluster B (A != B),
    // they are in completely separate geographic territories (e.g. Nandyal vs Proddatur).
    // Under no circumstances can they service each other across different regions!
    if (custClusterIndex != null && suppClusterIndex != null && custClusterIndex != suppClusterIndex) {
      return 0;
    }

    if (custClusterIndex != null && suppClusterIndex != null && custClusterIndex == suppClusterIndex) {
      score += 35; // Direct regional cluster match within same metropolitan/district region!
    }

    // 4. Significant locality keyword extraction (excluding generic terms)
    final genericTokens = {
      'road', 'street', 'lane', 'avenue', 'near', 'beside', 'opposite', 'opp',
      'behind', 'plot', 'flat', 'house', 'building', 'door', 'floor', 'block',
      'sector', 'phase', 'apartment', 'apartments', 'colony', 'nagar', 'city',
      'layout', 'enclave', 'town', 'cross', 'main', 'india', 'telangana', 'andhra',
      'pradesh', 'water', 'plant', 'hub', 'point', 'supply', 'supplier', 'station',
      'distributor', 'agency', 'services', 'and', 'the', 'for'
    };

    final custTokens = custTokensRaw.where((w) => !genericTokens.contains(w)).toSet();
    final suppTokens = allSuppTokens.where((w) => !genericTokens.contains(w)).toSet();

    final commonTokens = custTokens.intersection(suppTokens);
    if (commonTokens.isNotEmpty) {
      score += commonTokens.length * 15;
    }

    // 5. City match (bonus only if both specify non-empty specific city)
    if (custC.isNotEmpty && suppC.isNotEmpty && custC == suppC && custC != 'hyderabad' && custC != 'india') {
      score += 10;
    }

    return score;
  }

  /// Location proximity matcher: verifies if customer address/locality matches supplier's service location
  static bool isLocationMatch({
    required String customerAddress,
    String? customerCity,
    required String supplierAddress,
    String? supplierCity,
  }) {
    return calculateLocationScore(
      customerAddress: customerAddress,
      customerCity: customerCity,
      supplierAddress: supplierAddress,
      supplierCity: supplierCity,
    ) >= 8;
  }

  /// Get suppliers in proximity/range of the customer's delivery address, ordered by closest match.
  /// Strictly filters to ONLY return water plants that actually service this customer's address.
  /// Never shows faraway plants from other cities or regions!
  List<UserModel> getSurroundingSuppliers(String customerAddress, [String? customerCity]) {
    if (_suppliers.isEmpty) return [];

    // Filter out dummy data and eliminate any duplicate supplier accounts
    final validSuppliers = <UserModel>[];
    final seenKeys = <String>{};

    for (final s in _suppliers) {
      if (!isValidSupplierName(s.name, s.email, s.phone)) continue;
      if (s.uid.startsWith('sup_00')) continue;

      final cleanName = s.name.trim().toLowerCase();
      final cleanEmail = s.email.trim().toLowerCase();
      final cleanPhone = s.phone.replaceAll(RegExp(r'\D'), '');

      final nameKey = 'name:$cleanName';
      final emailKey = cleanEmail.isNotEmpty ? 'email:$cleanEmail' : null;
      final phoneKey = cleanPhone.isNotEmpty ? 'phone:$cleanPhone' : null;

      if (seenKeys.contains(nameKey) ||
          (emailKey != null && seenKeys.contains(emailKey)) ||
          (phoneKey != null && seenKeys.contains(phoneKey))) {
        continue; // Skip duplicate account!
      }

      seenKeys.add(nameKey);
      if (emailKey != null) seenKeys.add(emailKey);
      if (phoneKey != null) seenKeys.add(phoneKey);
      validSuppliers.add(s);
    }

    if (validSuppliers.isEmpty) return [];

    final scored = <UserModel, int>{};
    for (final s in validSuppliers) {
      final sc = calculateLocationScore(
        customerAddress: customerAddress,
        customerCity: customerCity,
        supplierAddress: s.address ?? '',
        supplierCity: s.city,
        deliveryAreas: s.deliveryAreas,
      );
      scored[s] = sc;
    }

    // STRICT GEOGRAPHIC FILTERING:
    // Only return plants whose delivery areas, address, or regional cluster match the customer's location (score > 0).
    // Out-of-region plants (score 0) are strictly excluded!
    final matchingSuppliers = validSuppliers
        .where((s) => (scored[s] ?? 0) > 0)
        .toList()
      ..sort((a, b) => (scored[b] ?? 0).compareTo(scored[a] ?? 0));

    return matchingSuppliers;
  }

  /// Returns all products for a specific supplier / water plant
  List<ProductModel> getProductsForSupplier(String supplierId) {
    if (supplierId.isEmpty) return products;
    final list = _products.where((p) => p.supplierId == supplierId).toList();
    if (list.isNotEmpty) return list;
    return _generateDefaultProductsForSupplier(supplierId);
  }

  /// Calculates estimated distance (km string) from customer to supplier based on score
  String getEstimatedDistance(UserModel supplier, String customerAddress, [String? customerCity]) {
    final score = calculateLocationScore(
      customerAddress: customerAddress,
      customerCity: customerCity,
      supplierAddress: supplier.address ?? '',
      supplierCity: supplier.city,
      deliveryAreas: supplier.deliveryAreas,
    );
    if (score >= 35) return '0.6 km';
    if (score >= 20) return '1.2 km';
    if (score >= 10) return '1.8 km';
    if (score >= 1) return '2.5 km';
    return '3.2 km';
  }

  /// Calculates estimated delivery time based on proximity
  String getEstimatedDeliveryTime(UserModel supplier, String customerAddress, [String? customerCity]) {
    final score = calculateLocationScore(
      customerAddress: customerAddress,
      customerCity: customerCity,
      supplierAddress: supplier.address ?? '',
      supplierCity: supplier.city,
      deliveryAreas: supplier.deliveryAreas,
    );
    if (score >= 35) return '15-25 mins';
    if (score >= 20) return '20-30 mins';
    if (score >= 10) return '25-35 mins';
    return '30-45 mins';
  }

  /// Resolves the human-readable water plant name for a given supplierId
  String getSupplierName(String supplierId) {
    if (supplierId.isEmpty || supplierId == 'sup_001' || supplierId == 'supplier') {
      return 'AquaConnect Certified Water Plant';
    }
    final match = _suppliers.where((s) => s.uid == supplierId).toList();
    if (match.isNotEmpty && isValidSupplierName(match.first.name, match.first.email, match.first.phone)) {
      return sanitizePlantName(match.first.name);
    }
    return 'AquaConnect Certified Water Plant';
  }

  /// Get ONLY orders intended for this supplier (matching supplierId and strictly in this supplier's range).
  /// Suppliers in different locations or representing other water plants will NEVER see orders from this plant.
  List<OrderModel> getOrdersForSupplier(
    String supplierId, {
    String? supplierAddress,
    String? supplierCity,
    List<String>? deliveryAreas,
    List<String>? supplierAreas,
  }) {
    if (supplierId.isEmpty) return [];
    final effectiveAreas = deliveryAreas ?? supplierAreas;

    return _orders.where((order) {
      // Ignore orders prior to sales reset
      if (_salesResetAfter != null && order.createdAt.isBefore(_salesResetAfter!)) {
        return false;
      }

      // 1. Order explicitly placed for this supplier -> strictly matches
      if (order.supplierId == supplierId) return true;

      // 2. Order explicitly assigned to a DIFFERENT supplier -> NEVER leak to this supplier!
      if (order.supplierId.isNotEmpty &&
          order.supplierId != 'sup_001' &&
          order.supplierId != 'supplier' &&
          order.supplierId != supplierId) {
        return false;
      }

      // 3. For unassigned / legacy orders (empty or default sup_001):
      // Only match if this supplier has high locality proximity (score >= 15) to delivery address
      if ((supplierAddress != null && supplierAddress.isNotEmpty) || (effectiveAreas != null && effectiveAreas.isNotEmpty)) {
        final sc = calculateLocationScore(
          customerAddress: order.deliveryAddress,
          customerCity: null,
          supplierAddress: supplierAddress ?? '',
          supplierCity: supplierCity,
          deliveryAreas: effectiveAreas,
        );
        if (sc >= 15) return true;
      }

      // Otherwise, this supplier is in a different location or not the assigned plant -> reject
      return false;
    }).toList();
  }

  /// Get ONLY customers belonging to this supplier's location or who placed orders with this supplier
  List<CustomerModel> getCustomersForSupplier(
    String supplierId, {
    String? supplierAddress,
    String? supplierCity,
    List<String>? deliveryAreas,
    List<String>? supplierAreas,
  }) {
    if (supplierId.isEmpty) return [];
    final effectiveAreas = deliveryAreas ?? supplierAreas;

    final supplierOrders = getOrdersForSupplier(
      supplierId,
      supplierAddress: supplierAddress,
      supplierCity: supplierCity,
      deliveryAreas: effectiveAreas,
    );
    final customerIdsWithOrders = supplierOrders.map((o) => o.customerId).toSet();
    final customerPhonesWithOrders = supplierOrders.map((o) => o.customerPhone).where((p) => p.isNotEmpty).toSet();
    final customerNamesWithOrders = supplierOrders.map((o) => o.customerName.toLowerCase().trim()).where((n) => n.isNotEmpty).toSet();

    return _customers.where((cust) {
      // 1. Has placed orders routed to this supplier
      if (customerIdsWithOrders.contains(cust.id) ||
          (cust.email.isNotEmpty && customerIdsWithOrders.contains(cust.email)) ||
          (cust.phone.isNotEmpty && customerPhonesWithOrders.contains(cust.phone)) ||
          customerNamesWithOrders.contains(cust.name.toLowerCase().trim())) {
        return true;
      }

      // 2. Located in this supplier's delivery zones with high proximity match
      if (((supplierAddress != null && supplierAddress.isNotEmpty) || (effectiveAreas != null && effectiveAreas.isNotEmpty)) && cust.address.isNotEmpty) {
        final sc = calculateLocationScore(
          customerAddress: cust.address,
          customerCity: null,
          supplierAddress: supplierAddress ?? '',
          supplierCity: supplierCity,
          deliveryAreas: effectiveAreas,
        );
        if (sc >= 15) return true;
      }

      return false;
    }).toList();
  }

  /// Register or update customer details so phone and address are visible to supplier
  void registerOrUpdateCustomer({
    required String id,
    required String name,
    required String phone,
    required String address,
    String? email,
  }) {
    final cleanEmail = email?.trim().toLowerCase() ?? '';
    final index = _customers.indexWhere((c) => c.id == id || (cleanEmail.isNotEmpty && c.email.toLowerCase() == cleanEmail));

    if (index != -1) {
      final existing = _customers[index];
      _customers[index] = CustomerModel(
        id: id,
        name: name.isNotEmpty ? name : existing.name,
        phone: phone.isNotEmpty ? phone : existing.phone,
        email: cleanEmail.isNotEmpty ? cleanEmail : existing.email,
        address: address.isNotEmpty ? address : existing.address,
        type: existing.type,
        cansHeld: existing.cansHeld,
        depositHeld: existing.depositHeld,
        duesAmount: existing.duesAmount,
        totalOrdersCount: existing.totalOrdersCount,
        totalCansDelivered: existing.totalCansDelivered,
        totalCansReturned: existing.totalCansReturned,
      );
    } else {
      _customers.add(CustomerModel(
        id: id,
        name: name.isNotEmpty ? name : 'Customer',
        phone: phone,
        email: cleanEmail,
        address: address,
        type: 'Residential',
        cansHeld: 0,
        depositHeld: 0.0,
        duesAmount: 0.0,
        totalOrdersCount: 0,
        totalCansDelivered: 0,
        totalCansReturned: 0,
      ));
    }
    notifyListeners();

    // Persist customer record to Firestore backend
    try {
      FirebaseFirestore.instance.collection('customers').doc(id).set({
        'customerId': id,
        'userId': id,
        'name': name,
        'phone': phone,
        'address': address,
        'email': cleanEmail,
        'totalOrders': 0,
        'totalAmount': 0.0,
        'pendingPayment': 0.0,
        'status': 'Active',
        'updatedAt': DateTime.now().toIso8601String(),
      }, SetOptions(merge: true)).catchError((e) {
        debugPrint('Firestore customer update error: $e');
      });
    } catch (e) {
      debugPrint('Firestore customer write error: $e');
    }
  }

  // Business Action: Place New Order
  void placeOrder({
    required String customerId,
    required String customerName,
    required String customerPhone,
    required List<OrderItem> items,
    required double totalAmount,
    required String deliveryAddress,
    required String deliverySlot,
    required String paymentMethod,
    required String paymentStatus,
    String? assignedDriver,
    String? supplierId,
    String? plantName,
    int emptyCansReturned = 0,
  }) {
    // Resolve supplierId to an exact supplier UID
    String resolvedSupplierId = (supplierId != null && supplierId.isNotEmpty && supplierId != 'sup_001' && supplierId != 'supplier')
        ? supplierId
        : '';
    String resolvedPlantName = sanitizePlantName(plantName);

    if (resolvedSupplierId.isEmpty) {
      final surrounding = getSurroundingSuppliers(deliveryAddress);
      if (surrounding.isNotEmpty && surrounding.first.uid.isNotEmpty) {
        resolvedSupplierId = surrounding.first.uid;
        if (resolvedPlantName.isEmpty || resolvedPlantName == 'AquaConnect Certified Water Plant') {
          resolvedPlantName = sanitizePlantName(surrounding.first.name);
        }
      } else if (_suppliers.isNotEmpty) {
        resolvedSupplierId = _suppliers.first.uid;
        if (resolvedPlantName.isEmpty || resolvedPlantName == 'AquaConnect Certified Water Plant') {
          resolvedPlantName = sanitizePlantName(_suppliers.first.name);
        }
      }
    }

    if (resolvedPlantName.isEmpty) {
      resolvedPlantName = getSupplierName(resolvedSupplierId);
    }

    final newOrderId = 'AC${1001 + _orders.length}';
    final newOrder = OrderModel(
      orderId: newOrderId,
      customerId: customerId,
      customerName: sanitizeName(customerName),
      customerPhone: customerPhone,
      supplierId: resolvedSupplierId,
      plantName: resolvedPlantName,
      items: items,
      totalAmount: totalAmount,
      deliveryAddress: deliveryAddress,
      deliveryDate: 'Today',
      deliveryTime: deliverySlot,
      deliveryPerson: assignedDriver ?? 'Direct Delivery',
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      orderStatus: 'Pending',
      createdAt: DateTime.now(),
    );

    _orders.insert(0, newOrder);

    // Update customer can balance & orders count
    final custIndex = _customers.indexWhere((c) => c.id == customerId);
    int totalCansInOrder = items.where((i) => i.name.contains('Can')).fold(0, (acc, i) => acc + i.quantity);

    if (custIndex != -1) {
      final cust = _customers[custIndex];
      cust.totalOrdersCount += 1;
      cust.totalCansDelivered += totalCansInOrder;
      cust.totalCansReturned += emptyCansReturned;
      cust.cansHeld = (cust.cansHeld + totalCansInOrder - emptyCansReturned).clamp(0, 999);
      if (paymentStatus == 'Pending' || paymentMethod == 'Credit / Pay Later') {
        cust.duesAmount += totalAmount;
      }
    }

    // Update inventory
    filledInPlant = (filledInPlant - totalCansInOrder).clamp(0, totalCansOwned);
    emptyInPlant = (emptyInPlant + emptyCansReturned).clamp(0, totalCansOwned);
    circulatingWithCustomers = (circulatingWithCustomers + totalCansInOrder - emptyCansReturned).clamp(0, totalCansOwned);

    notifyListeners();

    // Persist to Firestore backend
    try {
      FirebaseFirestore.instance.collection('orders').doc(newOrderId).set(newOrder.toJson()).catchError((e) {
        debugPrint('Firestore placeOrder error: $e');
      });
    } catch (e) {
      debugPrint('Firestore placeOrder error: $e');
    }
  }

  void createOrder({
    required String customerId,
    required String customerName,
    required String customerPhone,
    required List<OrderItem> items,
    required double totalAmount,
    required String deliveryAddress,
    required String deliverySlot,
    required String paymentMethod,
    required String paymentStatus,
    String? assignedDriver,
    String? supplierId,
    String? plantName,
    int emptyCansReturned = 0,
  }) {
    placeOrder(
      customerId: customerId,
      customerName: customerName,
      customerPhone: customerPhone,
      items: items,
      totalAmount: totalAmount,
      deliveryAddress: deliveryAddress,
      deliverySlot: deliverySlot,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      assignedDriver: assignedDriver,
      supplierId: supplierId,
      plantName: plantName,
      emptyCansReturned: emptyCansReturned,
    );
  }

  /// Synchronize real can passbook / ledger transactions dynamically from live orders
  void _syncCanLedgerFromOrders() {
    _canTransactions.clear();
    for (final o in _orders) {
      final cansCount = o.items.where((i) => i.name.contains('Can')).fold<int>(0, (acc, i) => acc + i.quantity);
      if (cansCount > 0 || o.emptyCansReturned > 0) {
        _canTransactions.add(CanTransactionModel(
          id: 'CTX_${o.orderId}',
          customerId: o.customerId,
          customerName: o.customerName,
          date: o.createdAt,
          type: o.orderStatus == 'Delivered' ? 'Delivered' : 'Dispatched',
          cansDelivered: cansCount,
          cansReturned: o.emptyCansReturned,
          runningBalance: cansCount - o.emptyCansReturned,
        ));
      }
    }
  }

  /// Manually set or configure total inventory cans owned by plant
  void setTotalCansOwned(int count) {
    totalCansOwned = count.clamp(0, 99999);
    recalculateCans();
    notifyListeners();
  }

  /// Recalculate can inventory based on customer can balances and returns
  void recalculateCans() {
    // Recalculate customer can holdings and orders from live orders list
    for (var cust in _customers) {
      final myOrders = _orders.where((o) => o.customerId == cust.id || (cust.email.isNotEmpty && o.customerId == cust.email)).toList();
      if (myOrders.isNotEmpty) {
        cust.totalOrdersCount = myOrders.length;
        final delOrders = myOrders.where((o) => o.orderStatus == 'Delivered').toList();
        final delCans = delOrders.fold<int>(0, (acc, o) => acc + o.items.fold<int>(0, (iSum, it) => iSum + it.quantity));
        if (delCans > 0) {
          cust.totalCansDelivered = delCans;
          cust.cansHeld = (delCans - cust.totalCansReturned).clamp(0, 999);
        }
      }
    }
    circulatingWithCustomers = _customers.fold<int>(0, (acc, c) => acc + c.cansHeld);
    final remaining = totalCansOwned - circulatingWithCustomers - emptyInPlant - damagedCans;
    filledInPlant = remaining.clamp(0, totalCansOwned);
  }

  /// Permanently delete multiple orders (for batch clearing delivered orders in Fleet)
  void deleteOrders(List<String> orderIds) {
    final idSet = orderIds.toSet();
    _orders.removeWhere((o) => idSet.contains(o.orderId));
    _syncCanLedgerFromOrders();
    recalculateCans();
    notifyListeners();

    try {
      final batch = FirebaseFirestore.instance.batch();
      for (final oid in orderIds) {
        final docRef = FirebaseFirestore.instance.collection('orders').doc(oid);
        batch.delete(docRef);
      }
      batch.commit().catchError((e) {
        debugPrint('Firestore deleteOrders batch error: $e');
      });
    } catch (e) {
      debugPrint('Firestore deleteOrders error: $e');
    }
  }

  /// Reset all sales and revenue records for supplier, refreshing reports to ₹0
  void resetSalesReport([String? supplierId]) {
    _salesResetAfter = DateTime.now();
    if (supplierId != null && supplierId.isNotEmpty) {
      _orders.removeWhere((o) =>
        o.supplierId == supplierId ||
        o.supplierId.isEmpty ||
        o.supplierId == 'sup_001' ||
        o.supplierId == 'sup_002' ||
        o.supplierId == 'sup_003' ||
        o.supplierId == 'supplier'
      );
    } else {
      _orders.clear();
    }
    _canTransactions.clear();
    for (var cust in _customers) {
      cust.duesAmount = 0.0;
    }
    _syncCanLedgerFromOrders();
    recalculateCans();
    notifyListeners();

    try {
      FirebaseFirestore.instance.collection('orders').get().then((snap) {
        final batch = FirebaseFirestore.instance.batch();
        for (var doc in snap.docs) {
          final data = doc.data();
          final sId = data['supplierId']?.toString() ?? '';
          if (supplierId == null ||
              supplierId.isEmpty ||
              sId == supplierId ||
              sId.isEmpty ||
              sId == 'sup_001' ||
              sId == 'sup_002' ||
              sId == 'sup_003' ||
              sId == 'supplier') {
            batch.delete(doc.reference);
          }
        }
        batch.commit().catchError((e) {
          debugPrint('Firestore resetSalesReport batch error: $e');
        });
      });
    } catch (e) {
      debugPrint('Firestore resetSalesReport error: $e');
    }
  }

  void updateOrderStatus(String orderId, String newStatus) {
    final index = _orders.indexWhere((o) => o.orderId == orderId);
    if (index != -1) {
      final current = _orders[index];
      final isNowDelivered = (newStatus == 'Delivered' && current.orderStatus != 'Delivered');

      final updatedOrder = OrderModel(
        orderId: current.orderId,
        customerId: current.customerId,
        customerName: current.customerName,
        customerPhone: current.customerPhone,
        supplierId: current.supplierId,
        plantName: current.plantName,
        items: current.items,
        totalAmount: current.totalAmount,
        deliveryAddress: current.deliveryAddress,
        deliveryDate: current.deliveryDate,
        deliveryTime: current.deliveryTime,
        deliveryPerson: current.deliveryPerson,
        paymentMethod: current.paymentMethod,
        paymentStatus: newStatus == 'Delivered' ? 'Paid' : current.paymentStatus,
        orderStatus: newStatus,
        createdAt: current.createdAt,
      );
      _orders[index] = updatedOrder;

      // When order is delivered, update customer can ledger and cans held
      if (isNowDelivered) {
        int custIdx = _customers.indexWhere((c) =>
          c.id == current.customerId ||
          (c.email.isNotEmpty && c.email == current.customerId) ||
          (c.phone.isNotEmpty && c.phone == current.customerPhone) ||
          c.name == current.customerName
        );
        final cansInOrder = current.items.fold<int>(0, (acc, i) => acc + i.quantity);

        if (custIdx != -1) {
          _customers[custIdx].totalOrdersCount += 1;
          _customers[custIdx].totalCansDelivered += cansInOrder;
          _customers[custIdx].cansHeld = (_customers[custIdx].cansHeld + cansInOrder - current.emptyCansReturned).clamp(0, 999);
          if (_customers[custIdx].duesAmount > 0 && current.paymentStatus == 'Paid') {
            _customers[custIdx].duesAmount = (_customers[custIdx].duesAmount - current.totalAmount).clamp(0.0, 999999.0);
          }
        } else {
          _customers.add(CustomerModel(
            id: current.customerId,
            name: current.customerName,
            phone: current.customerPhone,
            email: current.customerId.contains('@') ? current.customerId : '',
            address: current.deliveryAddress,
            type: 'Residential',
            cansHeld: (cansInOrder - current.emptyCansReturned).clamp(0, 999),
            depositHeld: 0.0,
            duesAmount: 0.0,
            totalOrdersCount: 1,
            totalCansDelivered: cansInOrder,
            totalCansReturned: current.emptyCansReturned,
          ));
        }

        _canTransactions.insert(
          0,
          CanTransactionModel(
            id: 'CTX_${current.orderId}',
            customerId: current.customerId,
            customerName: current.customerName,
            date: DateTime.now(),
            type: 'Delivered',
            cansDelivered: cansInOrder,
            cansReturned: current.emptyCansReturned,
            runningBalance: custIdx != -1 ? _customers[custIdx].cansHeld : cansInOrder,
          ),
        );
        recalculateCans();
      }

      notifyListeners();

      // Sync to Firestore backend
      try {
        FirebaseFirestore.instance.collection('orders').doc(orderId).update({
          'orderStatus': newStatus,
          'paymentStatus': updatedOrder.paymentStatus,
        }).catchError((e) {
          debugPrint('Firestore updateOrderStatus error: $e');
        });
      } catch (e) {
        debugPrint('Firestore updateOrderStatus error: $e');
      }
    }
  }

  /// Permanently delete an order record (for Delivered or Cancelled orders)
  void deleteOrder(String orderId) {
    _orders.removeWhere((o) => o.orderId == orderId);
    notifyListeners();

    // Delete from Firestore backend
    try {
      FirebaseFirestore.instance.collection('orders').doc(orderId).delete().catchError((e) {
        debugPrint('Firestore deleteOrder error: $e');
      });
    } catch (e) {
      debugPrint('Firestore deleteOrder error: $e');
    }
  }

  /// Permanently delete a customer record
  void deleteCustomer(String customerId) {
    _customers.removeWhere((c) => c.id == customerId);
    notifyListeners();

    try {
      FirebaseFirestore.instance.collection('customers').doc(customerId).delete().catchError((e) {
        debugPrint('Firestore deleteCustomer error: $e');
      });
    } catch (e) {
      debugPrint('Firestore deleteCustomer error: $e');
    }
  }

  /// Permanently delete all specified customer records in supplier's directory / reports
  void deleteAllCustomers(List<String> customerIds) {
    final idSet = customerIds.toSet();
    _customers.removeWhere((c) => idSet.contains(c.id));
    notifyListeners();

    try {
      final batch = FirebaseFirestore.instance.batch();
      for (final cid in customerIds) {
        final docRef = FirebaseFirestore.instance.collection('customers').doc(cid);
        batch.delete(docRef);
      }
      batch.commit().catchError((e) {
        debugPrint('Firestore deleteAllCustomers batch error: $e');
      });
    } catch (e) {
      debugPrint('Firestore deleteAllCustomers error: $e');
    }
  }

  void assignDriver(String orderId, String driverName) {
    final index = _orders.indexWhere((o) => o.orderId == orderId);
    if (index != -1) {
      final current = _orders[index];
      final updated = OrderModel(
        orderId: current.orderId,
        customerId: current.customerId,
        customerName: current.customerName,
        customerPhone: current.customerPhone,
        supplierId: current.supplierId,
        plantName: current.plantName,
        items: current.items,
        totalAmount: current.totalAmount,
        deliveryAddress: current.deliveryAddress,
        deliveryDate: current.deliveryDate,
        deliveryTime: current.deliveryTime,
        deliveryPerson: driverName,
        paymentMethod: current.paymentMethod,
        paymentStatus: current.paymentStatus,
        orderStatus: 'Out for Delivery',
        createdAt: current.createdAt,
      );
      _orders[index] = updated;
      notifyListeners();

      try {
        FirebaseFirestore.instance.collection('orders').doc(orderId).update({
          'deliveryPerson': driverName,
          'orderStatus': 'Out for Delivery',
        }).catchError((e) {
          debugPrint('Firestore assignDriver error: $e');
        });
      } catch (e) {
        debugPrint('Firestore assignDriver error: $e');
      }
    }
  }

  void addProduct(ProductModel product) {
    _products.add(product);
    notifyListeners();

    try {
      FirebaseFirestore.instance.collection('products').doc(product.productId).set(product.toJson()).catchError((e) {
        debugPrint('Firestore addProduct error: $e');
      });
    } catch (e) {
      debugPrint('Firestore addProduct error: $e');
    }
  }

  void deleteProduct(String productId) {
    _products.removeWhere((p) => p.productId == productId);
    notifyListeners();

    try {
      FirebaseFirestore.instance.collection('products').doc(productId).delete().catchError((e) {
        debugPrint('Firestore deleteProduct error: $e');
      });
    } catch (e) {
      debugPrint('Firestore deleteProduct error: $e');
    }
  }

  void clearProductStock(String productId) {
    updateProductStock(productId, 0);
  }

  void updateProductStock(String productId, int newStock) {
    final index = _products.indexWhere((p) => p.productId == productId);
    if (index != -1) {
      final p = _products[index];
      _products[index] = ProductModel(
        productId: p.productId,
        supplierId: p.supplierId,
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image,
        stock: newStock,
        unit: p.unit,
        containerType: p.containerType,
      );
      notifyListeners();

      try {
        FirebaseFirestore.instance.collection('products').doc(productId).update({
          'stock': newStock,
        }).catchError((e) {
          debugPrint('Firestore updateProductStock error: $e');
        });
      } catch (e) {
        debugPrint('Firestore updateProductStock error: $e');
      }
    }
  }

  void clearCustomerDues(String customerId, double amount) {
    final index = _customers.indexWhere((c) => c.id == customerId);
    if (index != -1) {
      _customers[index].duesAmount = (_customers[index].duesAmount - amount).clamp(0.0, 999999.0);
      notifyListeners();

      try {
        FirebaseFirestore.instance.collection('customers').doc(customerId).update({
          'pendingPayment': _customers[index].duesAmount,
        }).catchError((e) {
          debugPrint('Firestore clearCustomerDues error: $e');
        });
      } catch (e) {
        debugPrint('Firestore clearCustomerDues error: $e');
      }
    }
  }

  void returnCustomerCans(String customerId, int count) {
    final index = _customers.indexWhere((c) => c.id == customerId);
    if (index != -1) {
      _customers[index].cansHeld = (_customers[index].cansHeld - count).clamp(0, 999);
      _customers[index].totalCansReturned += count;
      emptyInPlant += count;
      circulatingWithCustomers = (circulatingWithCustomers - count).clamp(0, totalCansOwned);
      notifyListeners();
    }
  }

  void logRefillBatch(int batchSize) {
    emptyInPlant = (emptyInPlant - batchSize).clamp(0, totalCansOwned);
    filledInPlant = (filledInPlant + batchSize).clamp(0, totalCansOwned);
    notifyListeners();
  }

  void reportDamagedCan(int count) {
    damagedCans += count;
    emptyInPlant = (emptyInPlant - count).clamp(0, totalCansOwned);
    totalCansOwned = (totalCansOwned - count).clamp(0, 9999);
    notifyListeners();
  }

  void writeOffDamagedCans([int? count]) {
    if (count == null || count >= damagedCans) {
      damagedCans = 0;
    } else {
      damagedCans = (damagedCans - count).clamp(0, 9999);
    }
    notifyListeners();
  }

  void toggleSubscription(String subId) {
    final index = _subscriptions.indexWhere((s) => s.id == subId);
    if (index != -1) {
      _subscriptions[index].isActive = !_subscriptions[index].isActive;
      notifyListeners();
      try {
        FirebaseFirestore.instance.collection('subscriptions').doc(subId).update({
          'isActive': _subscriptions[index].isActive,
        }).catchError((_) {});
      } catch (_) {}
    }
  }

  void addSubscription(SubscriptionModel sub) {
    _subscriptions.add(sub);
    notifyListeners();
    try {
      FirebaseFirestore.instance.collection('subscriptions').doc(sub.id).set(sub.toJson()).catchError((_) {});
    } catch (_) {}
  }

  void updateSubscription(SubscriptionModel updatedSub) {
    final index = _subscriptions.indexWhere((s) => s.id == updatedSub.id);
    if (index != -1) {
      _subscriptions[index] = updatedSub;
      notifyListeners();
      try {
        FirebaseFirestore.instance.collection('subscriptions').doc(updatedSub.id).set(updatedSub.toJson()).catchError((_) {});
      } catch (_) {}
    }
  }

  void deleteSubscription(String subId) {
    _subscriptions.removeWhere((s) => s.id == subId);
    notifyListeners();
    try {
      FirebaseFirestore.instance.collection('subscriptions').doc(subId).delete().catchError((_) {});
    } catch (_) {}
  }
}
