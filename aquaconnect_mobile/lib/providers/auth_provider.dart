import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser;
  String? _userRole; // 'supplier' | 'customer'
  bool _isLoading = false;
  bool _isLoggingIn = false;
  StreamSubscription<DocumentSnapshot>? _userLiveSubscription;

  UserModel? get currentUser => _currentUser;
  String? get userRole => _userRole;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;

  AuthProvider() {
    _initAuthListener();
  }

  void _initAuthListener() {
    FirebaseAuth.instance.authStateChanges().listen((User? fbUser) async {
      // Do not auto-restore during an active login attempt to avoid role mismatch race conditions
      if (_isLoggingIn) return;

      if (fbUser == null) {
        _userLiveSubscription?.cancel();
        _userLiveSubscription = null;
        if (_currentUser != null || _userRole != null) {
          _currentUser = null;
          _userRole = null;
          notifyListeners();
        }
        return;
      }

      // Establish real-time Firestore stream listener so changes across ANY device sync instantly
      _userLiveSubscription?.cancel();
      _userLiveSubscription = FirebaseFirestore.instance
          .collection('users')
          .doc(fbUser.uid)
          .snapshots()
          .listen((doc) {
        if (doc.exists && doc.data() != null) {
          final data = Map<String, dynamic>.from(doc.data() as Map);
          final role = data['role']?.toString().toLowerCase() ?? 'customer';
          final restoredAddress = (data['address'] ?? '').toString().trim();
          final restoredPhone = (data['phone'] ?? '').toString().trim();

          _currentUser = UserModel(
            uid: fbUser.uid,
            name: data['name']?.toString() ?? fbUser.email?.split('@').first ?? 'User',
            email: fbUser.email ?? '',
            phone: restoredPhone.isNotEmpty ? restoredPhone : (data['phone']?.toString() ?? ''),
            role: role,
            profileImage: data['profileImage']?.toString(),
            address: restoredAddress.isNotEmpty ? restoredAddress : (data['address']?.toString() ?? ''),
            city: data['city']?.toString() ?? 'Hyderabad',
            deliveryAreas: (data['deliveryAreas'] is List)
                ? (data['deliveryAreas'] as List).map((e) => e.toString()).toList()
                : (data['deliveryAreas'] is String
                    ? [data['deliveryAreas'].toString()]
                    : null),
            gstNumber: data['gstNumber']?.toString(),
            operatingHours: data['operatingHours']?.toString(),
            openingTime: data['openingTime']?.toString(),
            closingTime: data['closingTime']?.toString(),
            isOpenToday: data['isOpenToday'] == true || data['isOpenToday'] == null,
            createdAt: data['createdAt'] != null
                ? DateTime.tryParse(data['createdAt'].toString()) ?? DateTime.now()
                : DateTime.now(),
          );
          _userRole = role;
          notifyListeners();
        }
      }, onError: (e) {
        debugPrint('Real-time multi-device user sync error: $e');
      });
    });
  }

  /// Sign In with verification against Firebase Authentication & Firestore
  /// Returns null on success, or an error message if invalid credentials or role mismatch.
  Future<String?> login({
    required String email,
    required String password,
    required String role,
  }) async {
    _isLoading = true;
    _isLoggingIn = true;
    notifyListeners();

    try {
      final cleanEmail = email.trim().toLowerCase();
      final expectedRole = role.trim().toLowerCase();

      // 1. Authenticate with Firebase Authentication
      UserCredential cred;
      try {
        cred = await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: cleanEmail,
          password: password,
        );
      } on FirebaseAuthException catch (authErr) {
        _isLoading = false;
        _isLoggingIn = false;
        notifyListeners();
        debugPrint('FirebaseAuth login error: ${authErr.code} - ${authErr.message}');
        if (authErr.code == 'user-not-found' || authErr.code == 'invalid-credential' || authErr.code == 'wrong-password') {
          return 'No account found with this email, or incorrect password. Please check your credentials or click "Create Account" below.';
        } else if (authErr.code == 'invalid-email') {
          return 'Please enter a valid email address.';
        } else if (authErr.code == 'user-disabled') {
          return 'This account has been disabled. Please contact support.';
        } else if (authErr.code == 'too-many-requests') {
          return 'Too many failed login attempts. Please try again later.';
        }
        return 'Authentication failed: ${authErr.message ?? authErr.code}';
      }

      final fbUser = cred.user;
      if (fbUser == null) {
        _isLoading = false;
        _isLoggingIn = false;
        notifyListeners();
        return 'Login failed. Please try again.';
      }

      // 2. Fetch authoritative user document from Cloud Firestore
      DocumentSnapshot userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(fbUser.uid)
          .get();

      // Fallback query by email if doc by uid doesn't exist or is empty
      if (!userDoc.exists || userDoc.data() == null) {
        final querySnap = await FirebaseFirestore.instance
            .collection('users')
            .where('email', isEqualTo: cleanEmail)
            .limit(1)
            .get();
        if (querySnap.docs.isNotEmpty) {
          userDoc = querySnap.docs.first;
        }
      }

      // Also check suppliers collection if logging in as supplier
      if ((!userDoc.exists || userDoc.data() == null) && expectedRole == 'supplier') {
        final suppDoc = await FirebaseFirestore.instance.collection('suppliers').doc(fbUser.uid).get();
        if (suppDoc.exists && suppDoc.data() != null) {
          userDoc = suppDoc;
        }
      }

      Map<String, dynamic> data = {};
      final rawData = userDoc.data();
      if (rawData is Map) {
        data = Map<String, dynamic>.from(rawData);
      }

      if (!userDoc.exists || data.isEmpty) {
        // If account exists in Firebase Auth but profile doc is missing/empty, auto-create profile with the designated role
        data = {
          'uid': fbUser.uid,
          'name': fbUser.displayName ?? cleanEmail.split('@').first,
          'email': cleanEmail,
          'role': expectedRole,
          'phone': '',
          'address': '',
          'city': 'Hyderabad',
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        };
        try {
          await FirebaseFirestore.instance
              .collection('users')
              .doc(fbUser.uid)
              .set(data, SetOptions(merge: true));
        } catch (setErr) {
          debugPrint('Profile auto-create error: $setErr');
        }
      }
      final registeredRole = (data['role']?.toString().toLowerCase() ?? 'customer');

      // 3. STRICT ROLE ENFORCEMENT: A Supplier cannot log into Customer, and a Customer cannot log into Supplier!
      if (registeredRole != expectedRole) {
        await FirebaseAuth.instance.signOut();
        _currentUser = null;
        _userRole = null;
        _isLoading = false;
        _isLoggingIn = false;
        notifyListeners();
        if (expectedRole == 'supplier') {
          return 'This account is registered as a Customer. Please switch to the Customer account to sign in.';
        } else {
          return 'This account is registered as a Supplier Plant. Please switch to the Supplier account to sign in.';
        }
      }

      final uid = fbUser.uid;
      final rawName = data['name']?.toString() ?? '';
      String name = rawName.trim();
      if (name.isEmpty || name.toLowerCase() == 'customer' || name.toLowerCase() == 'user' || name.contains('@')) {
        final emailPart = (name.contains('@') ? name : cleanEmail).split('@').first.replaceAll(RegExp(r'[^a-zA-Z0-9 ]'), ' ').trim();
        name = emailPart.isNotEmpty
            ? emailPart.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' ').trim()
            : (registeredRole == 'supplier' ? 'Plant Owner' : 'Customer');
      }
      String phone = (data['phone'] ?? '').toString().trim();
      String address = (data['address'] ?? '').toString().trim();
      String city = (data['city'] ?? 'Hyderabad').toString().trim();
      String? profileImage = data['profileImage']?.toString();

      // If customer address is missing from users doc, check customers collection & orders
      if (registeredRole == 'customer' && (address.isEmpty || phone.isEmpty)) {
        try {
          final custDoc = await FirebaseFirestore.instance.collection('customers').doc(uid).get();
          if (custDoc.exists && custDoc.data() != null) {
            final cData = custDoc.data()!;
            final cAddr = (cData['address'] ?? '').toString().trim();
            final cPhone = (cData['phone'] ?? '').toString().trim();
            if (cAddr.isNotEmpty && address.isEmpty) {
              address = cAddr;
            }
            if (cPhone.isNotEmpty && phone.isEmpty) {
              phone = cPhone;
            }
          }
        } catch (_) {}

        if (address.isEmpty) {
          try {
            final orderSnap = await FirebaseFirestore.instance
                .collection('orders')
                .where('customerId', isEqualTo: uid)
                .limit(1)
                .get();
            if (orderSnap.docs.isNotEmpty) {
              final oAddr = (orderSnap.docs.first.data()['deliveryAddress'] ?? '').toString().trim();
              if (oAddr.isNotEmpty) {
                address = oAddr;
              }
            }
          } catch (_) {}
        }

        // Persist discovered address & phone back to users doc
        if (address.isNotEmpty) {
          FirebaseFirestore.instance.collection('users').doc(uid).set({
            'address': address,
            'phone': phone,
            'city': city,
          }, SetOptions(merge: true)).catchError((_) {});
        }
      }

      DateTime parsedCreatedAt = DateTime.now();
      if (data['createdAt'] != null) {
        final raw = data['createdAt'];
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

      List<String>? parsedDeliveryAreas;
      if (data['deliveryAreas'] != null) {
        if (data['deliveryAreas'] is List) {
          parsedDeliveryAreas = (data['deliveryAreas'] as List).map((e) => e.toString()).toList();
        } else if (data['deliveryAreas'] is String) {
          parsedDeliveryAreas = (data['deliveryAreas'] as String)
              .split(',')
              .map((e) => e.trim())
              .where((e) => e.isNotEmpty)
              .toList();
        }
      }

      _currentUser = UserModel(
        uid: uid,
        name: name,
        email: cleanEmail,
        phone: phone,
        role: registeredRole,
        profileImage: profileImage,
        address: address,
        city: city,
        deliveryAreas: parsedDeliveryAreas,
        gstNumber: data['gstNumber']?.toString(),
        operatingHours: data['operatingHours']?.toString(),
        openingTime: data['openingTime']?.toString(),
        closingTime: data['closingTime']?.toString(),
        isOpenToday: data['isOpenToday'] == true || data['isOpenToday'] == null,
        createdAt: parsedCreatedAt,
      );
      _userRole = registeredRole;

      // 4. Ensure customer record exists in customers collection with phone & address
      if (registeredRole == 'customer') {
        try {
          await FirebaseFirestore.instance.collection('customers').doc(uid).set({
            'customerId': uid,
            'userId': uid,
            'name': name,
            'phone': phone,
            'address': address,
            'email': cleanEmail,
            'status': 'Active',
            'updatedAt': DateTime.now().toIso8601String(),
          }, SetOptions(merge: true));
        } catch (e) {
          debugPrint('Customer sync error: $e');
        }
      }

      _isLoading = false;
      _isLoggingIn = false;
      notifyListeners();
      return null;
    } catch (e) {
      await FirebaseAuth.instance.signOut();
      _currentUser = null;
      _userRole = null;
      _isLoading = false;
      _isLoggingIn = false;
      notifyListeners();
      return 'Login failed: ${e.toString()}';
    }
  }

  /// Create new account and store it in Firebase Authentication & Cloud Firestore backend
  Future<String?> register({
    required String name,
    required String email,
    required String password,
    required String role,
    String? phone,
    String? address,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final cleanEmail = email.trim().toLowerCase();

      // 1. Create User in Firebase Authentication (Users table in Firebase Console)
      UserCredential cred;
      try {
        cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(
          email: cleanEmail,
          password: password,
        );
      } on FirebaseAuthException catch (authErr) {
        _isLoading = false;
        notifyListeners();
        debugPrint('FirebaseAuth register error: ${authErr.code} - ${authErr.message}');
        if (authErr.code == 'email-already-in-use') {
          return 'This email is already registered in Firebase Authentication. Please switch to "Sign In".';
        } else if (authErr.code == 'weak-password') {
          return 'The password is too weak. Please use at least 6 characters.';
        } else if (authErr.code == 'invalid-email') {
          return 'Please enter a valid email address.';
        } else if (authErr.code == 'operation-not-allowed') {
          return 'Email/Password sign-in is not enabled in Firebase Console. Please enable it in Authentication.';
        }
        return 'Registration error: ${authErr.message ?? authErr.code}';
      }

      final fbUser = cred.user;
      if (fbUser == null) {
        _isLoading = false;
        notifyListeners();
        return 'Could not create Firebase user. Please try again.';
      }

      final uid = fbUser.uid;
      final cleanPhone = phone?.trim() ?? '';
      final cleanAddress = address?.trim() ?? '';
      final cleanName = name.trim();
      final cleanRole = role.trim().toLowerCase();

      // Update Firebase Auth user display name
      try {
        await fbUser.updateDisplayName(cleanName);
      } catch (_) {}

      final userMap = {
        'uid': uid,
        'name': cleanName,
        'email': cleanEmail,
        'phone': cleanPhone,
        'address': cleanAddress,
        'city': 'Hyderabad',
        'role': cleanRole,
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };

      // 2. Store in Firestore users collection
      await FirebaseFirestore.instance.collection('users').doc(uid).set(userMap);

      // 3. If Customer, store in customers collection
      if (cleanRole == 'customer') {
        await FirebaseFirestore.instance.collection('customers').doc(uid).set({
          'customerId': uid,
          'userId': uid,
          'name': cleanName,
          'phone': cleanPhone,
          'address': cleanAddress,
          'email': cleanEmail,
          'totalOrders': 0,
          'totalAmount': 0.0,
          'pendingPayment': 0.0,
          'status': 'Active',
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        }, SetOptions(merge: true));
      } else {
        // 4. If Supplier, store in suppliers collection
        await FirebaseFirestore.instance.collection('suppliers').doc(uid).set({
          'supplierId': uid,
          'businessName': cleanName.isNotEmpty ? cleanName : 'AquaConnect Certified Water Plant',
          'ownerName': cleanName.isNotEmpty ? cleanName : 'Plant Owner',
          'phone': cleanPhone,
          'email': cleanEmail,
          'address': cleanAddress.isNotEmpty ? cleanAddress : 'Water Plant Facility',
          'city': 'Hyderabad',
          'createdAt': DateTime.now().toIso8601String(),
        }, SetOptions(merge: true));
      }

      _currentUser = UserModel(
        uid: uid,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: cleanRole,
        address: cleanAddress,
        city: 'Hyderabad',
        createdAt: DateTime.now(),
      );
      _userRole = cleanRole;

      _isLoading = false;
      notifyListeners();
      return null;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return 'Registration failed: ${e.toString()}';
    }
  }

  void updateAddress(String address) {
    if (_currentUser != null) {
      _currentUser = UserModel(
        uid: _currentUser!.uid,
        name: _currentUser!.name,
        email: _currentUser!.email,
        phone: _currentUser!.phone,
        role: _currentUser!.role,
        address: address,
        city: _currentUser!.city,
        createdAt: _currentUser!.createdAt,
      );
      notifyListeners();

      // Sync address to Firestore backend
      try {
        FirebaseFirestore.instance.collection('users').doc(_currentUser!.uid).update({
          'address': address,
          'updatedAt': DateTime.now().toIso8601String(),
        });
        if (_currentUser!.role == 'customer') {
          FirebaseFirestore.instance.collection('customers').doc(_currentUser!.uid).update({
            'address': address,
            'updatedAt': DateTime.now().toIso8601String(),
          });
        }
      } catch (e) {
        debugPrint('Address sync error: $e');
      }
    }
  }

  void updateProfile({
    String? name,
    String? phone,
    String? address,
    String? city,
    String? profileImage,
    List<String>? deliveryAreas,
    String? gstNumber,
    String? operatingHours,
    String? openingTime,
    String? closingTime,
    bool? isOpenToday,
  }) {
    if (_currentUser != null) {
      _currentUser = UserModel(
        uid: _currentUser!.uid,
        name: name ?? _currentUser!.name,
        email: _currentUser!.email,
        phone: phone ?? _currentUser!.phone,
        role: _currentUser!.role,
        profileImage: profileImage ?? _currentUser!.profileImage,
        address: address ?? _currentUser!.address,
        city: city ?? _currentUser!.city,
        deliveryAreas: deliveryAreas ?? _currentUser!.deliveryAreas,
        gstNumber: gstNumber ?? _currentUser!.gstNumber,
        operatingHours: operatingHours ?? _currentUser!.operatingHours,
        openingTime: openingTime ?? _currentUser!.openingTime,
        closingTime: closingTime ?? _currentUser!.closingTime,
        isOpenToday: isOpenToday ?? _currentUser!.isOpenToday,
        createdAt: _currentUser!.createdAt,
      );
      notifyListeners();

      try {
        final updates = <String, dynamic>{
          'updatedAt': DateTime.now().toIso8601String(),
        };
        if (name != null) updates['name'] = name;
        if (phone != null) updates['phone'] = phone;
        if (address != null) updates['address'] = address;
        if (city != null) updates['city'] = city;
        if (profileImage != null) updates['profileImage'] = profileImage;
        if (deliveryAreas != null) updates['deliveryAreas'] = deliveryAreas;
        if (gstNumber != null) updates['gstNumber'] = gstNumber;
        if (operatingHours != null) updates['operatingHours'] = operatingHours;
        if (openingTime != null) updates['openingTime'] = openingTime;
        if (closingTime != null) updates['closingTime'] = closingTime;
        if (isOpenToday != null) updates['isOpenToday'] = isOpenToday;

        FirebaseFirestore.instance.collection('users').doc(_currentUser!.uid).set(updates, SetOptions(merge: true));
        if (_currentUser!.role == 'customer') {
          FirebaseFirestore.instance.collection('customers').doc(_currentUser!.uid).set(updates, SetOptions(merge: true));
        } else if (_currentUser!.role == 'supplier') {
          FirebaseFirestore.instance.collection('suppliers').doc(_currentUser!.uid).set(updates, SetOptions(merge: true));
        }
      } catch (e) {
        debugPrint('Profile sync error: $e');
      }
    }
  }

  Future<void> logout() async {
    _userLiveSubscription?.cancel();
    _userLiveSubscription = null;
    try {
      await FirebaseAuth.instance.signOut();
    } catch (_) {}
    _currentUser = null;
    _userRole = null;
    notifyListeners();
  }
}
