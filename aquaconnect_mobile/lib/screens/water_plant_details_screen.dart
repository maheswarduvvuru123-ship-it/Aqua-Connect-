import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user_model.dart';
import '../models/product_model.dart';
import '../providers/water_delivery_provider.dart';
import '../providers/cart_provider.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';
import '../widgets/checkout_bottom_sheet.dart';
import '../services/image_upload_service.dart';

class WaterPlantDetailsScreen extends StatefulWidget {
  final UserModel supplier;
  final String? deliveryAddress;
  final VoidCallback? onNavigateToOrders;

  const WaterPlantDetailsScreen({
    super.key,
    required this.supplier,
    this.deliveryAddress,
    this.onNavigateToOrders,
  });

  @override
  State<WaterPlantDetailsScreen> createState() => _WaterPlantDetailsScreenState();
}

class _WaterPlantDetailsScreenState extends State<WaterPlantDetailsScreen> {
  String _selectedCategory = 'All';

  // Category tags
  final List<String> _categories = [
    'All',
    'Normal Water (20L)',
    'Cool / Chilled Water',
    'Water Bottles',
    'Water Packets',
    'Accessories',
  ];

  bool _matchesCategory(ProductModel p, String cat) {
    if (cat == 'All') return true;
    final name = p.name.toLowerCase();
    final type = p.containerType.toLowerCase();
    final unit = p.unit.toLowerCase();

    if (cat == 'Normal Water (20L)') {
      return (name.contains('20l') || name.contains('normal')) &&
          !name.contains('cool') &&
          !name.contains('chilled') &&
          !name.contains('cold');
    }
    if (cat == 'Cool / Chilled Water') {
      return name.contains('cool') ||
          name.contains('chilled') ||
          name.contains('cold') ||
          unit.contains('chilled');
    }
    if (cat == 'Water Bottles') {
      return name.contains('bottle') || type.contains('box') || unit.contains('1l') || unit.contains('500ml');
    }
    if (cat == 'Water Packets') {
      return name.contains('packet') || name.contains('pouch') || type.contains('packet');
    }
    if (cat == 'Accessories') {
      return type.contains('accessory') || name.contains('tap') || name.contains('pump') || name.contains('stand');
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final waterData = Provider.of<WaterDeliveryProvider>(context);
    final cart = Provider.of<CartProvider>(context);

    // Get products specific to this plant
    final plantProducts = waterData.getProductsForSupplier(widget.supplier.uid);
    final filteredProducts = plantProducts.where((p) => _matchesCategory(p, _selectedCategory)).toList();

    final distanceStr = waterData.getEstimatedDistance(widget.supplier, widget.deliveryAddress ?? '');
    final timeStr = waterData.getEstimatedDeliveryTime(widget.supplier, widget.deliveryAddress ?? '');

    return ResponsiveLayout(
      maxWidth: 720,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Stack(
          children: [
            CustomScrollView(
              slivers: [
                // Top App Bar with Plant Hero Cover
                SliverAppBar(
                  expandedHeight: 220,
                  pinned: true,
                  backgroundColor: AquaTheme.primary,
                  leading: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: CircleAvatar(
                      backgroundColor: Colors.black.withValues(alpha: 0.5),
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ),
                  ),
                  flexibleSpace: FlexibleSpaceBar(
                    background: Stack(
                      fit: StackFit.expand,
                      children: [
                        ImageUploadService.buildImageWidget(
                          widget.supplier.profileImage ??
                              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
                          fit: BoxFit.cover,
                          placeholder: Container(
                            color: const Color(0xFF0284C7),
                            child: const Center(
                              child: Icon(Icons.water_drop, size: 80, color: Colors.white24),
                            ),
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.3),
                                Colors.black.withValues(alpha: 0.75),
                              ],
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 16,
                          left: 16,
                          right: 16,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.verified, color: Colors.white, size: 12),
                                    SizedBox(width: 4),
                                    Text(
                                      'VERIFIED WATER PLANT',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                widget.supplier.name,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.star, color: Colors.amber, size: 16),
                                  const SizedBox(width: 4),
                                  const Text(
                                    '4.8 (1,200+)',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    '•   ⚡ $timeStr   •   $distanceStr',
                                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Plant Information & Quality Certifications Card
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.all(14),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.location_on, color: Colors.redAccent, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.supplier.address?.isNotEmpty == true
                                        ? widget.supplier.address!
                                        : '${widget.supplier.city ?? "Hyderabad"} Regional Hub',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AquaTheme.textMain),
                                  ),
                                  if (widget.supplier.deliveryAreas != null && widget.supplier.deliveryAreas!.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      'Covered Villages & Towns: ${widget.supplier.deliveryAreas!.join(", ")}',
                                      style: const TextStyle(fontSize: 11, color: AquaTheme.primary, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            if (widget.supplier.phone.isNotEmpty) ...[
                              Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: IconButton(
                                  icon: const Icon(Icons.phone, color: Colors.green, size: 20),
                                  tooltip: 'Call Plant: ${widget.supplier.phone}',
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Plant Contact: ${widget.supplier.phone}'),
                                        duration: const Duration(seconds: 3),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Plant Operating Timings & Open/Closed Status Card
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: widget.supplier.isOpenToday ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: widget.supplier.isOpenToday ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                widget.supplier.isOpenToday ? Icons.schedule : Icons.remove_circle_outline,
                                color: widget.supplier.isOpenToday ? const Color(0xFF16A34A) : Colors.red,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          widget.supplier.isOpenToday ? '🟢 OPEN TODAY' : '🔴 CLOSED TODAY',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: widget.supplier.isOpenToday ? const Color(0xFF166534) : Colors.red.shade900,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            widget.supplier.effectiveOperatingHours,
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textMain),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Text(
                                      widget.supplier.isOpenToday
                                          ? 'Plant opens at ${widget.supplier.effectiveOpeningTime} and closes at ${widget.supplier.effectiveClosingTime}. Orders accepted now!'
                                          : 'Plant is closed today. Deliveries will resume at ${widget.supplier.effectiveOpeningTime}.',
                                      style: TextStyle(fontSize: 10, color: widget.supplier.isOpenToday ? const Color(0xFF15803D) : Colors.red.shade700),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Divider(height: 20),
                        // Quality Feature Pills
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildQualityBadge(Icons.sanitizer, '7-Stage RO + UV Purified'),
                            _buildQualityBadge(Icons.check_circle_outline, 'FSSAI Lic. Certified'),
                            _buildQualityBadge(Icons.water, 'TDS 80-120 PPM Optimal'),
                            _buildQualityBadge(Icons.cached, '₹0 Deposit on Empty Can'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Horizontal Category Selector
                SliverToBoxAdapter(
                  child: Container(
                    height: 48,
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      itemCount: _categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final cat = _categories[index];
                        final isSelected = _selectedCategory == cat;
                        return ChoiceChip(
                          label: Text(
                            cat,
                            style: TextStyle(
                              color: isSelected ? Colors.white : AquaTheme.textMain,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                              fontSize: 12,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: AquaTheme.primary,
                          backgroundColor: Colors.white,
                          side: BorderSide(
                            color: isSelected ? AquaTheme.primary : const Color(0xFFCBD5E1),
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          onSelected: (_) => setState(() => _selectedCategory = cat),
                        );
                      },
                    ),
                  ),
                ),

                // Section Header
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '$_selectedCategory Items (${filteredProducts.length})',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AquaTheme.textMain,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const Text(
                          '100% Genuine Water',
                          style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),

                // Product Cards List
                if (filteredProducts.isEmpty) ...[
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: Text(
                          'No products in this category for this plant.',
                          style: TextStyle(color: AquaTheme.textSecondary),
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final product = filteredProducts[index];
                          final qtyInCart = cart.items[product.productId] ?? 0;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Product Image Container with Badge
                                  Stack(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.network(
                                          product.image,
                                          width: 95,
                                          height: 95,
                                          fit: BoxFit.cover,
                                          errorBuilder: (ctx, _, __) => Container(
                                            width: 95,
                                            height: 95,
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFE0F2FE),
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(color: const Color(0xFFBAE6FD)),
                                            ),
                                            child: const Center(
                                              child: Icon(
                                                Icons.water_drop,
                                                size: 44,
                                                color: AquaTheme.primary,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                      Positioned(
                                        top: 4,
                                        left: 4,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: Colors.black.withValues(alpha: 0.65),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            product.unit,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(width: 14),

                                  // Product Details
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Product Name
                                        Text(
                                          product.name,
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                            color: AquaTheme.textMain,
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),

                                        // Container Type & Seal
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF1F5F9),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            product.containerType,
                                            style: const TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                              color: AquaTheme.textSecondary,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 6),

                                        // Short Description
                                        Text(
                                          product.description,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Color(0xFF64748B),
                                            height: 1.3,
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 8),

                                        // Price & Add To Cart Button
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              '₹${product.price.toStringAsFixed(0)}',
                                              style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.w800,
                                                color: AquaTheme.primary,
                                              ),
                                            ),

                                            // Cart Action Stepper
                                            if (qtyInCart == 0) ...[
                                              ElevatedButton(
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: AquaTheme.primary,
                                                  foregroundColor: Colors.white,
                                                  elevation: 0,
                                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                                  shape: RoundedRectangleBorder(
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  minimumSize: const Size(60, 34),
                                                ),
                                                onPressed: () {
                                                  cart.addItem(product.productId, 1);
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    SnackBar(
                                                      content: Text('Added 1x ${product.name} to cart'),
                                                      duration: const Duration(seconds: 1),
                                                    ),
                                                  );
                                                },
                                                child: const Text(
                                                  'ADD',
                                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                                                ),
                                              ),
                                            ] else ...[
                                              Container(
                                                height: 34,
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF0284C7),
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    IconButton(
                                                      icon: const Icon(Icons.remove, size: 16, color: Colors.white),
                                                      padding: EdgeInsets.zero,
                                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 34),
                                                      onPressed: () {
                                                        cart.updateQuantity(product.productId, -1);
                                                      },
                                                    ),
                                                    Text(
                                                      '$qtyInCart',
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontWeight: FontWeight.w800,
                                                        fontSize: 14,
                                                      ),
                                                    ),
                                                    IconButton(
                                                      icon: const Icon(Icons.add, size: 16, color: Colors.white),
                                                      padding: EdgeInsets.zero,
                                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 34),
                                                      onPressed: () {
                                                        cart.updateQuantity(product.productId, 1);
                                                      },
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        childCount: filteredProducts.length,
                      ),
                    ),
                  ),
                ],

                // Bottom Padding for Floating Cart Bar
                SliverToBoxAdapter(
                  child: SizedBox(height: 90 + MediaQuery.of(context).padding.bottom),
                ),
              ],
            ),

            // Floating Bottom Cart Bar
            if (cart.totalCount > 0)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16 + MediaQuery.of(context).padding.bottom,
                child: GestureDetector(
                  onTap: () {
                    showWaterCheckoutBottomSheet(
                      context,
                      targetSupplierId: widget.supplier.uid,
                      preselectedAddress: widget.deliveryAddress,
                      onOrderPlaced: () {
                        Navigator.pop(context); // Close details screen back to home
                        if (widget.onNavigateToOrders != null) {
                          widget.onNavigateToOrders!();
                        }
                      },
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
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${cart.totalCount} ITEM${cart.totalCount > 1 ? "S" : ""} IN CART',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '₹${cart.calculateSubtotal(waterData.products).toStringAsFixed(0)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 18,
                              ),
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
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              SizedBox(width: 6),
                              Icon(Icons.arrow_forward, color: Colors.white, size: 16),
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
      ),
    );
  }

  Widget _buildQualityBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AquaTheme.primary),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
          ),
        ],
      ),
    );
  }
}
