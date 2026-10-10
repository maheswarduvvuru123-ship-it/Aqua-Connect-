import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/water_delivery_provider.dart';
import '../models/user_model.dart';
import '../models/product_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';
import 'customer_orders_screen.dart';
import 'customer_subscriptions_screen.dart';
import 'customer_profile_screen.dart';
import 'water_plant_details_screen.dart';
import '../widgets/zomato_location_picker_dialog.dart';
import '../widgets/checkout_bottom_sheet.dart';
import '../services/image_upload_service.dart';

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  int _currentTabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      _CustomerStoreTab(onNavigateToOrders: () {
        setState(() => _currentTabIndex = 1);
      }),
      const CustomerOrdersScreen(),
      const CustomerSubscriptionsScreen(),
      const CustomerProfileScreen(),
    ];

    return ResponsiveLayout(
      maxWidth: 720,
      child: Scaffold(
        body: IndexedStack(
          index: _currentTabIndex,
          children: tabs,
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentTabIndex,
          selectedItemColor: AquaTheme.primary,
          unselectedItemColor: AquaTheme.textSecondary,
          type: BottomNavigationBarType.fixed,
          onTap: (index) => setState(() => _currentTabIndex = index),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.water_drop_outlined), activeIcon: Icon(Icons.water_drop), label: 'Store'),
            BottomNavigationBarItem(icon: Icon(Icons.local_shipping_outlined), activeIcon: Icon(Icons.local_shipping), label: 'Orders'),
            BottomNavigationBarItem(icon: Icon(Icons.autorenew), label: 'Auto-Refill'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Account'),
          ],
        ),
      ),
    );
  }
}

class _CustomerStoreTab extends StatefulWidget {
  final VoidCallback onNavigateToOrders;
  const _CustomerStoreTab({required this.onNavigateToOrders});

  @override
  State<_CustomerStoreTab> createState() => _CustomerStoreTabState();
}

class _CustomerStoreTabState extends State<_CustomerStoreTab> {
  String? _currentUserId;
  String? _lastUserAddress;
  String? _selectedDeliveryAddress;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    if (user != null) {
      final reg = (user.address ?? '').trim();
      if (_currentUserId != user.uid || (reg.isNotEmpty && reg != _lastUserAddress)) {
        _currentUserId = user.uid;
        _lastUserAddress = reg;
        if (reg.isNotEmpty) {
          _selectedDeliveryAddress = reg;
        }
      }
    }
  }
  String _searchQuery = '';
  String _selectedFilter = 'All Plants';
  final TextEditingController _searchController = TextEditingController();

  final List<String> _filters = [
    'All Plants',
    'Normal 20L',
    'Cool Water',
    'Water Bottles',
    'Water Packets',
    'Fast Delivery (< 30m)',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openLocationPicker() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final initial = _selectedDeliveryAddress ?? auth.currentUser?.address;
    final res = await showDialog<LocationResult>(
      context: context,
      builder: (ctx) => ZomatoLocationPickerDialog(
        role: 'customer',
        initialAddress: initial,
      ),
    );

    if (res != null && mounted) {
      setState(() {
        _selectedDeliveryAddress = res.formattedAddress;
        _lastUserAddress = res.formattedAddress;
      });
      auth.updateProfile(
        address: res.formattedAddress,
        city: res.city,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Delivery address updated to: ${res.locality.isNotEmpty ? res.locality : res.city}'),
          backgroundColor: Colors.green[800],
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  bool _plantMatchesFilter(UserModel plant, List<ProductModel> products, String filter) {
    if (filter == 'All Plants') return true;
    final plantProds = products.where((p) => p.supplierId == plant.uid).toList();

    if (filter == 'Normal 20L') {
      return plantProds.any((p) =>
          (p.name.toLowerCase().contains('20l') || p.name.toLowerCase().contains('normal')) &&
          !p.name.toLowerCase().contains('cool') &&
          !p.name.toLowerCase().contains('chilled'));
    }
    if (filter == 'Cool Water') {
      return plantProds.any((p) =>
          p.name.toLowerCase().contains('cool') ||
          p.name.toLowerCase().contains('chilled') ||
          p.name.toLowerCase().contains('ice'));
    }
    if (filter == 'Water Bottles') {
      return plantProds.any((p) =>
          p.name.toLowerCase().contains('bottle') ||
          p.containerType.toLowerCase().contains('box') ||
          p.unit.toLowerCase().contains('1l'));
    }
    if (filter == 'Water Packets') {
      return plantProds.any((p) =>
          p.name.toLowerCase().contains('packet') ||
          p.name.toLowerCase().contains('pouch') ||
          p.containerType.toLowerCase().contains('packet'));
    }
    if (filter == 'Fast Delivery (< 30m)') {
      return true; // All local plants offer express delivery
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final cart = Provider.of<CartProvider>(context);
    final waterData = Provider.of<WaterDeliveryProvider>(context);

    final registeredAddress = (auth.currentUser?.address ?? '').trim();
    if (_selectedDeliveryAddress == null && registeredAddress.isNotEmpty) {
      _selectedDeliveryAddress = registeredAddress;
    }
    final activeAddress = _selectedDeliveryAddress ??
        (registeredAddress.isNotEmpty ? registeredAddress : 'Gachibowli, Hyderabad');

    // Extract concise locality for headline and badges (e.g. Proddatur, Nandyal, Hyderabad)
    String activeLocality = 'Nearby';
    final addrLower = activeAddress.toLowerCase();
    if (addrLower.contains('proddatur')) {
      activeLocality = 'Proddatur';
    } else if (addrLower.contains('nandyal')) {
      activeLocality = 'Nandyal';
    } else if (addrLower.contains('panyam') || addrLower.contains('518112') || addrLower.contains('balapanur')) {
      activeLocality = 'Panyam / Nandyal';
    } else if (addrLower.contains('hyderabad') || addrLower.contains('gachibowli')) {
      activeLocality = 'Hyderabad';
    } else if (addrLower.contains('kurnool')) {
      activeLocality = 'Kurnool';
    } else if (addrLower.contains('kadapa') || addrLower.contains('cuddapah')) {
      activeLocality = 'Kadapa';
    } else {
      final parts = activeAddress.split(',');
      if (parts.isNotEmpty && parts.first.trim().isNotEmpty) {
        activeLocality = parts.first.trim();
      }
    }

    // Retrieve ALL nearby surrounding water plants sorted by closest match!
    final surroundingSuppliers = waterData.getSurroundingSuppliers(
      activeAddress,
      auth.currentUser?.city,
    );

    // Apply search and category filters
    final filteredSuppliers = surroundingSuppliers.where((supplier) {
      if (!WaterDeliveryProvider.isValidSupplierName(supplier.name, supplier.email, supplier.phone)) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchName = supplier.name.toLowerCase().contains(q);
        final matchAddr = (supplier.address ?? '').toLowerCase().contains(q);
        final matchAreas = supplier.deliveryAreas?.any((a) => a.toLowerCase().contains(q)) ?? false;
        final plantProds = waterData.getProductsForSupplier(supplier.uid);
        final matchProd = plantProds.any((p) => p.name.toLowerCase().contains(q));
        if (!matchName && !matchAddr && !matchAreas && !matchProd) return false;
      }
      return _plantMatchesFilter(supplier, waterData.products, _selectedFilter);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        titleSpacing: 16,
        title: Text(
          'Hello, ${auth.currentUser?.name.split(" ")[0] ?? "Customer"} 👋',
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'My Deliveries',
            onPressed: widget.onNavigateToOrders,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AquaTheme.danger),
            tooltip: 'Sign Out',
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 90),
            children: [
              // 1. Zomato / Swiggy Style Delivery Location Bar
              InkWell(
                onTap: _openLocationPicker,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.location_on, color: Colors.redAccent, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Text(
                                  'DELIVERING WATER TO',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AquaTheme.textSecondary,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                SizedBox(width: 4),
                                Icon(Icons.keyboard_arrow_down, size: 16, color: AquaTheme.primary),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              activeAddress,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: AquaTheme.textMain,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit_location_alt, size: 14, color: AquaTheme.primary),
                            SizedBox(width: 4),
                            Text(
                              'Change',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.primary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // 2. Search Bar
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: "Search water plants, 20L cans, cool water...",
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search, color: AquaTheme.primary, size: 22),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              setState(() {
                                _searchQuery = '';
                                _searchController.clear();
                              });
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                  ),
                  onChanged: (val) => setState(() => _searchQuery = val),
                ),
              ),
              const SizedBox(height: 12),

              // 3. Horizontal Filter Chips (Zomato/Swiggy Style)
              SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _filters.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final f = _filters[index];
                    final isSelected = _selectedFilter == f;
                    return ChoiceChip(
                      label: Text(
                        f,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected ? Colors.white : AquaTheme.textMain,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: AquaTheme.primary,
                      backgroundColor: Colors.white,
                      side: BorderSide(
                        color: isSelected ? AquaTheme.primary : const Color(0xFFCBD5E1),
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      onSelected: (_) => setState(() => _selectedFilter = f),
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),

              // 4. Quick Category Shortcuts
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'WHAT DO YOU NEED TODAY?',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AquaTheme.textSecondary,
                      letterSpacing: 0.6,
                    ),
                  ),
                  Text('Pure & Hygienic', style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildCategoryCard(
                    title: 'Normal 20L',
                    subtitle: 'Room Temp',
                    filterTag: 'Normal 20L',
                    imageUrl: 'https://5.imimg.com/data5/AP/MU/MY-4515526/20-litre-can-jug-jar-dispenser-500x500.jpg',
                  ),
                  const SizedBox(width: 8),
                  _buildCategoryCard(
                    title: 'Cool Water',
                    subtitle: 'Chilled 20L',
                    filterTag: 'Cool Water',
                    imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2021/4/AM/HZ/GJ/35689307/20ltres-cool-can-1--500x500.jpeg',
                  ),
                  const SizedBox(width: 8),
                  _buildCategoryCard(
                    title: 'Bottles',
                    subtitle: '1L Box 12s',
                    filterTag: 'Water Bottles',
                    imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2022/11/NF/WB/JJ/45711328/1-litre-packed-drinking-water-bottle-500x500.jpg',
                  ),
                  const SizedBox(width: 8),
                  _buildCategoryCard(
                    title: 'Packets',
                    subtitle: 'Pouches 50s',
                    filterTag: 'Water Packets',
                    imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2024/3/401402931/HR/MG/JG/11262634/ldpe-packed-drinking-water-pouch-500x500.jpg',
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // 5. Popular Water Plants in Active Locality (Zomato/Swiggy Card Feed)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'WATER PLANTS IN ${activeLocality.toUpperCase()}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: AquaTheme.textMain,
                        letterSpacing: 0.5,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: filteredSuppliers.isNotEmpty
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${filteredSuppliers.length} Plants in $activeLocality',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: filteredSuppliers.isNotEmpty
                            ? const Color(0xFF15803D)
                            : const Color(0xFFDC2626),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              if (filteredSuppliers.isEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(Icons.location_off_outlined, size: 50, color: Colors.blueGrey),
                        const SizedBox(height: 10),
                        Text(
                          'No Water Plants Delivering to "$activeLocality" Yet',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Plants only appear when they service your active delivery area.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 14),
                        ElevatedButton.icon(
                          onPressed: _openLocationPicker,
                          icon: const Icon(Icons.edit_location_alt, size: 16),
                          label: const Text('Change Delivery Location'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AquaTheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                // Render Each Nearby Water Plant as a Rich Card
                ...filteredSuppliers.map((plant) {
                  final distance = waterData.getEstimatedDistance(plant, activeAddress);
                  final deliveryTime = waterData.getEstimatedDeliveryTime(plant, activeAddress);
                  final plantProducts = waterData.getProductsForSupplier(plant.uid);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (ctx) => WaterPlantDetailsScreen(
                              supplier: plant,
                              deliveryAddress: activeAddress,
                              onNavigateToOrders: widget.onNavigateToOrders,
                            ),
                          ),
                        );
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Plant Hero Image Banner
                          Stack(
                            children: [
                              ClipRRect(
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                                child: ImageUploadService.buildImageWidget(
                                  (plant.profileImage != null &&
                                          plant.profileImage!.isNotEmpty &&
                                          !plant.profileImage!.contains('1544816155-12df9643f363'))
                                      ? plant.profileImage!
                                      : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
                                  height: 160,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                  placeholder: Container(
                                    height: 160,
                                    color: const Color(0xFF0284C7),
                                    child: const Center(
                                      child: Icon(Icons.water_drop, size: 60, color: Colors.white30),
                                    ),
                                  ),
                                ),
                              ),
                              // Top Right Delivery Time Pill
                              Positioned(
                                top: 10,
                                right: 10,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.15),
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.flash_on, color: Colors.orange, size: 14),
                                      const SizedBox(width: 4),
                                      Text(
                                        deliveryTime,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 11,
                                          color: AquaTheme.textMain,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              // Top Left Distance Pill
                              Positioned(
                                top: 10,
                                left: 10,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.65),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.navigation, color: Colors.white, size: 12),
                                      const SizedBox(width: 4),
                                      Text(
                                        distance,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              // Bottom Gradient Ribbon
                              Positioned(
                                bottom: 0,
                                left: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.bottomCenter,
                                      end: Alignment.topCenter,
                                      colors: [
                                        Colors.black.withValues(alpha: 0.7),
                                        Colors.transparent,
                                      ],
                                    ),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.verified_user, color: Color(0xFF6EE7B7), size: 14),
                                      SizedBox(width: 6),
                                      Text(
                                        'FSSAI Certified • 100% Sealed & RO+UV Purified',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),

                          // Plant Details Body
                          Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        plant.name,
                                        style: const TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w800,
                                          color: AquaTheme.textMain,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF15803D),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            '4.8',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          SizedBox(width: 2),
                                          Icon(Icons.star, color: Colors.white, size: 12),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),

                                // Offerings Preview Chips
                                const Text(
                                  'Normal RO Cans • Cool Water • Packaged Bottles • Packets',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF64748B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),

                                // Plant Operating Timings & Open/Closed Status
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: plant.isOpenToday ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: plant.isOpenToday ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        plant.isOpenToday ? Icons.access_time_filled : Icons.do_not_disturb_on,
                                        size: 13,
                                        color: plant.isOpenToday ? const Color(0xFF16A34A) : Colors.red,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        plant.isOpenToday
                                            ? 'Open: ${plant.effectiveOperatingHours}'
                                            : 'Closed Today (Opens at ${plant.effectiveOpeningTime})',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: plant.isOpenToday ? const Color(0xFF166534) : Colors.red.shade900,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 6),

                                // Location String
                                Row(
                                  children: [
                                    const Icon(Icons.place_outlined, size: 14, color: Colors.black45),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        plant.address?.isNotEmpty == true
                                            ? plant.address!
                                            : '${plant.city ?? "Hyderabad"} Plant Zone',
                                        style: const TextStyle(fontSize: 11, color: Colors.black54),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                if (plant.deliveryAreas != null && plant.deliveryAreas!.isNotEmpty) ...[
                                  const SizedBox(height: 3),
                                  Row(
                                    children: [
                                      const Icon(Icons.local_shipping_outlined, size: 13, color: AquaTheme.primary),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          'Villages & Areas: ${plant.deliveryAreas!.join(", ")}',
                                          style: const TextStyle(fontSize: 10, color: AquaTheme.primary, fontWeight: FontWeight.w600),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                const Divider(height: 18),

                                // Bottom Action Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Starts from ₹45 / can',
                                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.primary),
                                        ),
                                        Text(
                                          '${plantProducts.length} items available',
                                          style: const TextStyle(fontSize: 10, color: AquaTheme.textSecondary),
                                        ),
                                      ],
                                    ),
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AquaTheme.primary,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        elevation: 0,
                                      ),
                                      onPressed: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (ctx) => WaterPlantDetailsScreen(
                                              supplier: plant,
                                              deliveryAddress: activeAddress,
                                              onNavigateToOrders: widget.onNavigateToOrders,
                                            ),
                                          ),
                                        );
                                      },
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text('VIEW MENU', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                                          SizedBox(width: 4),
                                          Icon(Icons.arrow_forward_ios, size: 12),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ],
          ),

          // Floating Cart Bar (Bottom)
          if (cart.totalCount > 0)
            Positioned(
              left: 14,
              right: 14,
              bottom: 14,
              child: GestureDetector(
                onTap: () {
                  showWaterCheckoutBottomSheet(
                    context,
                    preselectedAddress: activeAddress,
                    onOrderPlaced: widget.onNavigateToOrders,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(7),
                            decoration: const BoxDecoration(
                              color: AquaTheme.primary,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${cart.totalCount}',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('ITEMS IN CART', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w800)),
                              Text(
                                '₹${cart.calculateSubtotal(waterData.products).toStringAsFixed(0)}',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AquaTheme.primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          children: [
                            Text(
                              'VIEW CART',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward, color: Colors.white, size: 14),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

    Widget _buildCategoryCard({
    required String title,
    required String subtitle,
    required String filterTag,
    String? imageUrl,
  }) {
    final isSelected = _selectedFilter == filterTag;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedFilter = isSelected ? 'All Plants' : filterTag;
          });
        },
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AquaTheme.primary : const Color(0xFFE2E8F0),
              width: isSelected ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: imageUrl != null && imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        height: 48,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, _, __) => Container(
                          height: 48,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0F2FE),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Center(
                            child: Icon(Icons.water_drop, color: AquaTheme.primary, size: 26),
                          ),
                        ),
                      )
                    : Container(
                        height: 48,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: isSelected ? AquaTheme.primary.withValues(alpha: 0.15) : const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Icon(Icons.water_drop, color: AquaTheme.primary, size: 26),
                        ),
                      ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? AquaTheme.primary : AquaTheme.textMain,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 9, color: AquaTheme.textSecondary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
