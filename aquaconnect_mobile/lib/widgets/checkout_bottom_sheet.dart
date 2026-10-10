import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/water_delivery_provider.dart';
import '../models/order_model.dart';
import '../utils/theme.dart';

/// Opens the unified water checkout sheet with empty can exchange, slot picker,
/// and live supplier matching.
void showWaterCheckoutBottomSheet(
  BuildContext context, {
  String? targetSupplierId,
  String? preselectedAddress,
  VoidCallback? onOrderPlaced,
}) {
  final cart = Provider.of<CartProvider>(context, listen: false);
  final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
  final auth = Provider.of<AuthProvider>(context, listen: false);

  bool hasEmptyCanToExchange = true;
  String selectedSlot = 'Morning (07:00 AM - 10:00 AM)';
  String selectedAddress = preselectedAddress ??
      ((auth.currentUser?.address?.isNotEmpty == true)
          ? auth.currentUser!.address!
          : 'Primary Delivery Location');
  String paymentMethod = 'Cash on Delivery';
  String? chosenSupplierId = targetSupplierId;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    constraints: const BoxConstraints(maxWidth: 600),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setSheetState) {
        final subtotal = cart.calculateSubtotal(waterData.products);

        // Calculate 20L cans count in cart
        int total20LCans = 0;
        cart.items.forEach((pid, qty) {
          final p = waterData.products.firstWhere(
            (prod) => prod.productId == pid,
            orElse: () => waterData.products.first,
          );
          if (p.name.contains('20L') || p.containerType == 'Returnable Jar') {
            total20LCans += qty;
          }
        });

        // Deposit if no empty can to exchange (₹150 per can)
        double canDeposit = hasEmptyCanToExchange ? 0.0 : (total20LCans * 150.0);
        double grandTotal = subtotal + canDeposit;

        return ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.88,
            maxWidth: 600,
          ),
          child: Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'Your Water Cart & Checkout',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(),

                  if (cart.items.isEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 30.0),
                      child: Center(child: Text('Your water cart is empty')),
                    )
                  ] else ...[
                    // Cart Items List
                    ...cart.items.entries.map((entry) {
                      final p = waterData.products.firstWhere(
                        (prod) => prod.productId == entry.key,
                        orElse: () => waterData.products.first,
                      );
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          p.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        subtitle: Text('${entry.value} x ₹${p.price.toStringAsFixed(0)}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, size: 20),
                              onPressed: () {
                                cart.updateQuantity(p.productId, -1);
                                setSheetState(() {});
                              },
                            ),
                            Text(
                              '${entry.value}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline, size: 20, color: AquaTheme.primary),
                              onPressed: () {
                                cart.updateQuantity(p.productId, 1);
                                setSheetState(() {});
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                    const Divider(height: 20),

                    // Empty Can Exchange Toggle
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: hasEmptyCanToExchange ? const Color(0xFFD1FAE5) : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  hasEmptyCanToExchange ? '✓ Empty Can Available' : '⚠ No Empty Can (New Can)',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: hasEmptyCanToExchange ? Colors.green[800] : Colors.amber[900],
                                  ),
                                ),
                                Text(
                                  hasEmptyCanToExchange
                                      ? 'Zero deposit. Hand over empty can at delivery.'
                                      : '+₹150 refundable deposit applied per 20L can.',
                                  style: const TextStyle(fontSize: 11, color: AquaTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: hasEmptyCanToExchange,
                            activeThumbColor: Colors.green,
                            onChanged: (val) => setSheetState(() => hasEmptyCanToExchange = val),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Delivery Slot Selector
                    const Text(
                      'DELIVERY TIME SLOT',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      initialValue: selectedSlot,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Morning (07:00 AM - 10:00 AM)',
                          child: Text('Morning 7:00 AM - 10:00 AM', overflow: TextOverflow.ellipsis),
                        ),
                        DropdownMenuItem(
                          value: 'Afternoon (12:00 PM - 03:00 PM)',
                          child: Text('Afternoon 12:00 PM - 3:00 PM', overflow: TextOverflow.ellipsis),
                        ),
                        DropdownMenuItem(
                          value: 'Evening (05:00 PM - 08:00 PM)',
                          child: Text('Evening 5:00 PM - 8:00 PM', overflow: TextOverflow.ellipsis),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) setSheetState(() => selectedSlot = val);
                      },
                    ),
                    const SizedBox(height: 12),

                    // Delivery Address & Locality
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'DELIVERY LOCATION & ADDRESS',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                        ),
                        Text(
                          'Doorstep Delivery',
                          style: TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      initialValue: selectedAddress,
                      decoration: InputDecoration(
                        hintText: 'Enter Flat/House No, Area, Street, Landmark...',
                        prefixIcon: const Icon(Icons.location_on, color: Colors.redAccent, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      onChanged: (val) {
                        setSheetState(() => selectedAddress = val);
                      },
                    ),
                    const SizedBox(height: 10),

                    // Fulfilling Water Plant Card & Selector
                    Builder(
                      builder: (_) {
                        final nearbySuppliers = waterData.getSurroundingSuppliers(selectedAddress, auth.currentUser?.city);
                        final matchingChosen = nearbySuppliers.where((s) => s.uid == chosenSupplierId).firstOrNull;
                        final matchingTarget = nearbySuppliers.where((s) => s.uid == targetSupplierId).firstOrNull;
                        final activeSupplier = matchingChosen ??
                            matchingTarget ??
                            (nearbySuppliers.isNotEmpty ? nearbySuppliers.first : null);

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (nearbySuppliers.length > 1) ...[
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'SELECT WATER PLANT NEARBY',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                                  ),
                                  Text(
                                    '${nearbySuppliers.length} Plants in Range',
                                    style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                decoration: BoxDecoration(
                                  border: Border.all(color: const Color(0xFFCBD5E1)),
                                  borderRadius: BorderRadius.circular(10),
                                  color: Colors.white,
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    isExpanded: true,
                                    value: (activeSupplier != null && nearbySuppliers.any((s) => s.uid == activeSupplier.uid))
                                        ? activeSupplier.uid
                                        : (nearbySuppliers.isNotEmpty ? nearbySuppliers.first.uid : null),
                                    items: nearbySuppliers.map((s) {
                                      final dist = waterData.getEstimatedDistance(s, selectedAddress);
                                      return DropdownMenuItem<String>(
                                        value: s.uid,
                                        child: Text(
                                          '🏭 ${s.name} • $dist',
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      );
                                    }).toList(),
                                    onChanged: (val) {
                                      if (val != null) {
                                        setSheetState(() => chosenSupplierId = val);
                                      }
                                    },
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFBBF7D0)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.storefront, color: Colors.green, size: 24),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'FULFILLING WATER PLANT',
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                                        ),
                                        Text(
                                          activeSupplier != null
                                              ? '${activeSupplier.name} (${activeSupplier.address?.isNotEmpty == true ? activeSupplier.address : (activeSupplier.city ?? "Local Plant")})'
                                              : 'AquaConnect Water Plant',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        if (activeSupplier != null) ...[
                                          const SizedBox(height: 3),
                                          Row(
                                            children: [
                                              Icon(
                                                activeSupplier.isOpenToday ? Icons.access_time : Icons.schedule,
                                                size: 13,
                                                color: activeSupplier.isOpenToday ? const Color(0xFF16A34A) : Colors.red,
                                              ),
                                              const SizedBox(width: 4),
                                              Expanded(
                                                child: Text(
                                                  activeSupplier.isOpenToday
                                                      ? 'Timings: ${activeSupplier.effectiveOperatingHours} (Open Today)'
                                                      : 'Plant Closed Today (Opens at ${activeSupplier.effectiveOpeningTime})',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                    color: activeSupplier.isOpenToday ? const Color(0xFF166534) : Colors.red.shade900,
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                        const Text(
                                          'Order routes directly to this plant account.',
                                          style: TextStyle(fontSize: 11, color: Colors.black54),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 14),

                    // Payment Method
                    const Text(
                      'PAYMENT MODE',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: ['Cash on Delivery', 'UPI / QR Pay'].map((mode) {
                        final isSelected = paymentMethod == mode;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4.0),
                            child: ChoiceChip(
                              label: Text(
                                mode,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                              selected: isSelected,
                              selectedColor: AquaTheme.primaryLight,
                              onSelected: (_) => setSheetState(() => paymentMethod = mode),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const Divider(height: 24),

                    // Bill Breakdown
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Water Subtotal:'),
                        Text('₹${subtotal.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    if (canDeposit > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 4.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Refundable Can Deposit ($total20LCans cans):',
                              style: const TextStyle(color: Colors.amber),
                            ),
                            Text(
                              '+₹${canDeposit.toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.amber),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text(
                          '₹${grandTotal.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AquaTheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Confirm Button
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AquaTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        final List<OrderItem> orderItems = [];
                        cart.items.forEach((pid, qty) {
                          final p = waterData.products.firstWhere(
                            (prod) => prod.productId == pid,
                            orElse: () => waterData.products.first,
                          );
                          orderItems.add(OrderItem(
                            productId: p.productId,
                            name: p.name,
                            quantity: qty,
                            price: p.price,
                            unit: p.unit,
                          ));
                        });

                        final user = auth.currentUser;
                        final surroundingSuppliers = waterData.getSurroundingSuppliers(
                          selectedAddress,
                          auth.currentUser?.city,
                        );
                        final matchingChosen = surroundingSuppliers.where((s) => s.uid == chosenSupplierId).firstOrNull;
                        final matchingTarget = surroundingSuppliers.where((s) => s.uid == targetSupplierId).firstOrNull;
                        final chosenSupplier = matchingChosen ??
                            matchingTarget ??
                            (surroundingSuppliers.isNotEmpty ? surroundingSuppliers.first : null);

                        String registeredCustName = 'Customer';
                        if (user != null) {
                          final rawUName = user.name.trim();
                          if (rawUName.isNotEmpty && rawUName.toLowerCase() != 'customer' && !rawUName.contains('@')) {
                            registeredCustName = rawUName;
                          } else if (user.email.isNotEmpty) {
                            final prefix = user.email.split('@').first.replaceAll(RegExp(r'[^a-zA-Z0-9 ]'), ' ').trim();
                            registeredCustName = prefix.isNotEmpty
                                ? prefix.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' ').trim()
                                : 'Customer';
                          }
                        }

                        waterData.createOrder(
                          customerId: user?.uid ?? 'cust_guest',
                          customerName: registeredCustName,
                          customerPhone: user?.phone ?? '',
                          deliveryAddress: selectedAddress,
                          deliverySlot: selectedSlot,
                          items: orderItems,
                          totalAmount: grandTotal,
                          paymentMethod: paymentMethod,
                          paymentStatus: paymentMethod == 'UPI / QR Pay' ? 'Paid' : 'Pending',
                          emptyCansReturned: hasEmptyCanToExchange ? total20LCans : 0,
                          assignedDriver: 'Pending Driver Dispatch',
                          supplierId: chosenSupplier?.uid,
                          plantName: WaterDeliveryProvider.sanitizePlantName(chosenSupplier?.name),
                        );

                        cart.clear();
                        Navigator.pop(ctx);

                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Order Placed Successfully! Fresh water is on the way.'),
                            backgroundColor: Colors.green,
                          ),
                        );

                        if (onOrderPlaced != null) {
                          onOrderPlaced();
                        }
                      },
                      child: Text(
                        'Place Order • ₹${grandTotal.toStringAsFixed(0)}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    ),
  );
}
