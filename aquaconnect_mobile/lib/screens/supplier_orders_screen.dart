import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/water_delivery_provider.dart';
import '../models/order_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';

class SupplierOrdersScreen extends StatefulWidget {
  const SupplierOrdersScreen({super.key});

  @override
  State<SupplierOrdersScreen> createState() => _SupplierOrdersScreenState();
}

class _SupplierOrdersScreenState extends State<SupplierOrdersScreen> {
  String _selectedStatus = 'All';
  String _searchQuery = '';

  final List<String> _statuses = [
    'All',
    'Pending',
    'Confirmed',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ];

  void _confirmDeleteOrder(BuildContext context, WaterDeliveryProvider waterData, String orderId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_forever, color: Colors.red),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Delete Completed Order',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete order #$orderId from your POS orders and database? This action cannot be undone.',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.delete, size: 16, color: Colors.white),
            label: const Text('Delete Order', style: TextStyle(color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red[800]),
            onPressed: () {
              waterData.deleteOrder(orderId);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Order #$orderId deleted successfully.'),
                  backgroundColor: Colors.red[800],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showNewPosOrderModal(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
    final availableCustomers = waterData.getCustomersForSupplier(
      auth.currentUser?.uid ?? '',
      supplierAddress: auth.currentUser?.address,
      supplierCity: auth.currentUser?.city,
      deliveryAreas: auth.currentUser?.deliveryAreas,
    );

    final displayCustomers = availableCustomers.isNotEmpty ? availableCustomers : waterData.customers;

    if (displayCustomers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please register at least one customer from the Customers tab first.'),
          backgroundColor: AquaTheme.primary,
        ),
      );
      return;
    }
    if (waterData.products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add water products from the Products tab first.'),
          backgroundColor: AquaTheme.primary,
        ),
      );
      return;
    }

    String selectedCustomerId = displayCustomers.first.id;
    final Map<String, int> productQuantities = {
      waterData.products.first.productId: 1,
    };
    int returnedCans = 0;
    String paymentMethod = 'Cash';
    String paymentStatus = 'Paid';
    String deliverySlot = 'Immediate (POS Counter)';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      constraints: const BoxConstraints(maxWidth: 600),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final cust = displayCustomers.firstWhere(
            (c) => c.id == selectedCustomerId,
            orElse: () => displayCustomers.first,
          );

          // Calculate bill
          double totalAmount = 0.0;
          productQuantities.forEach((pid, qty) {
            final p = waterData.products.firstWhere(
              (prod) => prod.productId == pid,
              orElse: () => waterData.products.first,
            );
            totalAmount += p.price * qty;
          });

          return ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.9,
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
                            '⚡ Water POS - Quick Order Entry',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 8),

                    // Customer Selector
                    const Text('SELECT CUSTOMER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: selectedCustomerId,
                      isExpanded: true,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      ),
                      items: displayCustomers.map((c) {
                        return DropdownMenuItem(
                          value: c.id,
                          child: Text('${c.name} (${c.type}) • ${c.cansHeld} cans held', overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedCustomerId = val);
                      },
                    ),
                    const SizedBox(height: 14),

                    // Products & Quantities
                    const Text('SELECT WATER PRODUCTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                    const SizedBox(height: 6),
                    ...waterData.products.take(3).map((prod) {
                      final currentQty = productQuantities[prod.productId] ?? 0;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(prod.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  Text('₹${prod.price.toStringAsFixed(0)} • Stock: ${prod.stock}', style: const TextStyle(fontSize: 12, color: AquaTheme.textSecondary)),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 20),
                                  onPressed: currentQty > 0
                                      ? () => setModalState(() => productQuantities[prod.productId] = currentQty - 1)
                                      : null,
                                ),
                                Text('$currentQty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 20, color: AquaTheme.primary),
                                  onPressed: () => setModalState(() => productQuantities[prod.productId] = currentQty + 1),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 10),

                    // Can Return Input
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Empty 20L Cans Returned', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AquaTheme.primary)),
                              Text('Deducts from customer held can balance', style: TextStyle(fontSize: 11, color: AquaTheme.textSecondary)),
                            ],
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove, size: 18),
                                onPressed: returnedCans > 0 ? () => setModalState(() => returnedCans--) : null,
                              ),
                              Text('$returnedCans', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              IconButton(
                                icon: const Icon(Icons.add, size: 18),
                                onPressed: () => setModalState(() => returnedCans++),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Payment Method
                    const Text('PAYMENT MODE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                    const SizedBox(height: 6),
                    Row(
                      children: ['Cash', 'UPI', 'Credit / Dues'].map((mode) {
                        final isSelected = paymentMethod == mode;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4.0),
                            child: ChoiceChip(
                              label: Text(mode, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                              selected: isSelected,
                              selectedColor: AquaTheme.primaryLight,
                              onSelected: (_) => setModalState(() {
                                paymentMethod = mode;
                                paymentStatus = mode == 'Credit / Dues' ? 'Pending' : 'Paid';
                              }),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const Divider(height: 24),

                    // Bill Total & Confirm
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Payable:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text('₹${totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AquaTheme.primary)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AquaTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: totalAmount <= 0
                          ? null
                          : () {
                              final List<OrderItem> orderItems = [];
                              productQuantities.forEach((pid, qty) {
                                if (qty > 0) {
                                  final p = waterData.products.firstWhere((prod) => prod.productId == pid);
                                  orderItems.add(OrderItem(
                                    productId: p.productId,
                                    name: p.name,
                                    quantity: qty,
                                    price: p.price,
                                    unit: p.unit,
                                  ));
                                }
                              });

                              waterData.createOrder(
                                customerId: cust.id,
                                customerName: cust.name,
                                customerPhone: cust.phone,
                                deliveryAddress: cust.address,
                                deliverySlot: deliverySlot,
                                items: orderItems,
                                totalAmount: totalAmount,
                                paymentMethod: paymentMethod,
                                paymentStatus: paymentStatus,
                                emptyCansReturned: returnedCans,
                                assignedDriver: waterData.drivers.isNotEmpty ? waterData.drivers.first.name : 'Plant Direct',
                                supplierId: auth.currentUser?.uid ?? '',
                              );

                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('✅ POS Order confirmed successfully!'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            },
                      child: const Text('Confirm POS Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  
  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final waterData = Provider.of<WaterDeliveryProvider>(context);

    final supplierOrders = waterData.getOrdersForSupplier(
      auth.currentUser?.uid ?? '',
      supplierAddress: auth.currentUser?.address,
      supplierCity: auth.currentUser?.city,
      deliveryAreas: auth.currentUser?.deliveryAreas,
    );

    final filtered = supplierOrders.where((o) {
      if (WaterDeliveryProvider.isEmailAccountOrder(o)) return false;
      final matchesStatus = _selectedStatus == 'All' || o.orderStatus == _selectedStatus;
      final matchesSearch = o.orderId.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          o.customerName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          o.deliveryAddress.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders & POS Management'),
      ),
      body: ResponsiveLayout(
        maxWidth: 820,
        child: Column(
          children: [
            // Search & Filter
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search by Order ID, customer, address...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onChanged: (val) => setState(() => _searchQuery = val),
              ),
            ),

            // Status Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: _statuses.map((status) {
                  final isSelected = _selectedStatus == status;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: FilterChip(
                      label: Text(status),
                      selected: isSelected,
                      selectedColor: AquaTheme.primaryLight,
                      checkmarkColor: AquaTheme.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? AquaTheme.primary : AquaTheme.textSecondary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      onSelected: (_) => setState(() => _selectedStatus = status),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 8),

            // Orders List
            Expanded(
              child: filtered.isEmpty
                  ? const Center(child: Text('No orders match your filter.'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16.0),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final order = filtered[index];
                        final isDelivered = order.orderStatus == 'Delivered';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Customer: ${waterData.getOrderCustomerDisplayName(order)}',
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Order #${order.orderId} • Placed by ${waterData.getOrderCustomerDisplayName(order)}',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: AquaTheme.primary,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    Chip(
                                      label: Text(order.orderStatus),
                                      backgroundColor: isDelivered
                                          ? const Color(0xFFD1FAE5)
                                          : const Color(0xFFE0F2FE),
                                      labelStyle: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: isDelivered ? Colors.green[800] : AquaTheme.primary,
                                      ),
                                    ),
                                  ],
                                ),
                                Text('📞 ${order.customerPhone}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                                Text('📍 ${order.deliveryAddress}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                                const SizedBox(height: 4),
                                Text('📦 ${order.items.map((i) => "${i.name} x ${i.quantity}").join(", ")}',
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                const Divider(height: 20),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('₹${order.totalAmount.toStringAsFixed(0)}',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                        Text('${order.paymentMethod} • ${order.paymentStatus}',
                                            style: TextStyle(fontSize: 11, color: order.paymentStatus == 'Paid' ? Colors.green : Colors.orange[800], fontWeight: FontWeight.bold),
                                            overflow: TextOverflow.ellipsis),
                                      ],
                                    ),
                                    if (order.orderStatus == 'Pending')
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                              minimumSize: const Size(0, 32),
                                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                            ),
                                            onPressed: () => waterData.updateOrderStatus(order.orderId, 'Confirmed'),
                                            child: const Text('Accept', style: TextStyle(fontSize: 12)),
                                          ),
                                          const SizedBox(width: 6),
                                          OutlinedButton(
                                            style: OutlinedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                              minimumSize: const Size(0, 32),
                                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              foregroundColor: AquaTheme.danger,
                                            ),
                                            onPressed: () => waterData.updateOrderStatus(order.orderId, 'Cancelled'),
                                            child: const Text('Reject', style: TextStyle(fontSize: 12)),
                                          ),
                                        ],
                                      )
                                    else if (order.orderStatus == 'Confirmed' || order.orderStatus == 'Out for Delivery')
                                      ElevatedButton.icon(
                                        icon: const Icon(Icons.check, size: 14, color: Colors.white),
                                        label: const Text('Mark Delivered', style: TextStyle(color: Colors.white, fontSize: 12)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.green,
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          minimumSize: const Size(0, 32),
                                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        ),
                                        onPressed: () => waterData.updateOrderStatus(order.orderId, 'Delivered'),
                                      )
                                    else if (order.orderStatus == 'Delivered' || order.orderStatus == 'Cancelled')
                                      OutlinedButton.icon(
                                        icon: const Icon(Icons.delete_outline, size: 14, color: Colors.red),
                                        label: const Text('Delete', style: TextStyle(color: Colors.red, fontSize: 12)),
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(color: Colors.red),
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          minimumSize: const Size(0, 32),
                                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        ),
                                        onPressed: () => _confirmDeleteOrder(context, waterData, order.orderId),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AquaTheme.primary,
        icon: const Icon(Icons.point_of_sale, color: Colors.white),
        label: const Text('New POS Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _showNewPosOrderModal(context),
      ),
    );
  }
}
