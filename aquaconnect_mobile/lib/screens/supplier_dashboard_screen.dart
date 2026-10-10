import '../models/order_model.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/water_delivery_provider.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';
import 'supplier_orders_screen.dart';
import 'supplier_inventory_screen.dart';
import 'supplier_reports_screen.dart';
import 'supplier_products_screen.dart';
import 'supplier_profile_screen.dart';

class SupplierDashboardScreen extends StatefulWidget {
  const SupplierDashboardScreen({super.key});

  @override
  State<SupplierDashboardScreen> createState() => _SupplierDashboardScreenState();
}

class _SupplierDashboardScreenState extends State<SupplierDashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      const _SupplierHomeTab(),
      const SupplierOrdersScreen(),
      const SupplierInventoryScreen(),
      const SupplierReportsScreen(),
    ];

    return ResponsiveLayout(
      maxWidth: 820,
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: pages,
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex,
          selectedItemColor: AquaTheme.primary,
          unselectedItemColor: AquaTheme.textSecondary,
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 11,
          unselectedFontSize: 10,
          onTap: (index) => setState(() => _currentIndex = index),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Dashboard'),
            BottomNavigationBarItem(icon: Icon(Icons.shopping_bag_outlined), activeIcon: Icon(Icons.shopping_bag), label: 'Orders'),
            BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2), label: 'Inventory'),
            BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: 'Reports'),
          ],
        ),
      ),
    );
  }
}

class _SupplierHomeTab extends StatefulWidget {
  const _SupplierHomeTab();

  @override
  State<_SupplierHomeTab> createState() => _SupplierHomeTabState();
}

class _SupplierHomeTabState extends State<_SupplierHomeTab> {
  String _selectedFilter = 'All';

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
                'Delete Order Record',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete order #$orderId? This action removes it from your dashboard and backend.',
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

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final waterData = Provider.of<WaterDeliveryProvider>(context);

    final rawSupplierOrders = waterData.getOrdersForSupplier(
      auth.currentUser?.uid ?? '',
      supplierAddress: auth.currentUser?.address,
      supplierCity: auth.currentUser?.city,
      deliveryAreas: auth.currentUser?.deliveryAreas,
    );
    final supplierOrders = rawSupplierOrders.where((o) => !WaterDeliveryProvider.isEmailAccountOrder(o)).toList();
    final supplierCustomers = waterData.getCustomersForSupplier(
      auth.currentUser?.uid ?? '',
      supplierAddress: auth.currentUser?.address,
      supplierCity: auth.currentUser?.city,
      deliveryAreas: auth.currentUser?.deliveryAreas,
    );

    final now = DateTime.now();
    bool isTodayOrder(OrderModel o) {
      if (o.deliveryDate == 'Today') return true;
      if (o.createdAt.year == now.year && o.createdAt.month == now.month && o.createdAt.day == now.day) return true;
      final todayIso = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
      return o.deliveryDate == todayIso;
    }

    final todayOrdersCount = supplierOrders.where(isTodayOrder).length;
        final deliveredOrdersCount = supplierOrders.where((o) => o.orderStatus == 'Delivered').length;
    final pendingOrdersCount = supplierOrders.where((o) => o.orderStatus == 'Pending' || o.orderStatus == 'Confirmed').length;

    final todayRevenue = supplierOrders
        .where((o) => (isTodayOrder(o) || o.orderStatus == 'Delivered') && o.orderStatus != 'Cancelled')
        .fold(0.0, (acc, o) => acc + o.totalAmount);
    final pendingDues = supplierCustomers.fold(0.0, (acc, c) => acc + c.duesAmount);

    final filteredOrders = supplierOrders.where((o) {
      if (_selectedFilter == 'Pending') return o.orderStatus == 'Pending' || o.orderStatus == 'Confirmed';
      if (_selectedFilter == 'Delivered') return o.orderStatus == 'Delivered';
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text('AquaConnect Supplier'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.inventory_outlined),
            tooltip: 'Product Catalog',
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SupplierProductsScreen()));
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Plant Settings',
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SupplierProfileScreen()));
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AquaTheme.danger),
            tooltip: 'Sign Out',
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Greeting Banner
          Card(
            color: AquaTheme.primary,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome, ${auth.currentUser?.name ?? "Supplier"}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    auth.currentUser?.address != null && auth.currentUser!.address!.isNotEmpty
                        ? auth.currentUser!.address!
                        : 'Active Plant Operations & Fulfillment',
                    style: const TextStyle(fontSize: 13, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Statistics Header
          const Text('LIVE OPERATIONS & METRICS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
          const SizedBox(height: 8),

          // Row 1: Today's Orders & Delivered Orders (Out for delivery removed)
          Row(
            children: [
              Expanded(child: _buildMetricCard('Today\'s Orders', '$todayOrdersCount', Icons.shopping_bag, Colors.blue)),
              const SizedBox(width: 10),
              Expanded(child: _buildMetricCard('Delivered Today', '$deliveredOrdersCount', Icons.check_circle_outline, Colors.green)),
            ],
          ),
          const SizedBox(height: 10),

          // Row 2: Today's Sales, Pending Dues
          Row(
            children: [
              Expanded(child: _buildMetricCard('Today\'s Sales', '₹${todayRevenue.toStringAsFixed(0)}', Icons.currency_rupee, Colors.green)),
              const SizedBox(width: 10),
              Expanded(child: _buildMetricCard('Pending Dues', '₹${pendingDues.toStringAsFixed(0)}', Icons.pending, Colors.orange)),
            ],
          ),
          const SizedBox(height: 20),

          

          // Recent Orders Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('CUSTOMER ORDERS & DELIVERIES', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
              Text('${filteredOrders.length} Orders', style: const TextStyle(fontSize: 12, color: AquaTheme.primary, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 10),

          // Order Status Filter Chips (All, Pending, Delivered)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip('All', '${supplierOrders.length}'),
                const SizedBox(width: 8),
                _filterChip('Pending', '$pendingOrdersCount'),
                const SizedBox(width: 8),
                _filterChip('Delivered', '$deliveredOrdersCount'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (filteredOrders.isEmpty)
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 36.0, horizontal: 16.0),
                child: Column(
                  children: [
                    const Icon(Icons.inbox_outlined, size: 40, color: AquaTheme.textSecondary),
                    const SizedBox(height: 8),
                    Text(
                      _selectedFilter == 'All'
                          ? 'No Customer Orders Yet'
                          : 'No $_selectedFilter Orders',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    const Text('New orders placed by nearby customers will show here instantly.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary)),
                  ],
                ),
              ),
            )
          else
            ...filteredOrders.map((order) {
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
                              : const Color(0xFFFEF3C7),
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDelivered
                                ? Colors.green[800]
                                : Colors.amber[900],
                          ),
                        ),
                      ],
                    ),
                    if (order.customerPhone.isNotEmpty)
                      Text('📞 ${order.customerPhone}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                    Text('📍 Drop: ${order.deliveryAddress}',
                        style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                    Text('📦 Cans: ${order.items.map((i) => "${i.name} x ${i.quantity}").join(", ")}',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '₹${order.totalAmount.toStringAsFixed(0)} • ${order.paymentMethod} (${order.paymentStatus})',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (order.orderStatus == 'Pending' || order.orderStatus == 'Confirmed' )
                          ElevatedButton.icon(
                            icon: const Icon(Icons.check, size: 14, color: Colors.white),
                            label: const Text('Mark Delivered', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              minimumSize: const Size(0, 32),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            onPressed: () => waterData.updateOrderStatus(order.orderId, 'Delivered'),
                          ),
                        if (order.orderStatus == 'Delivered' || order.orderStatus == 'Cancelled')
                          OutlinedButton.icon(
                            icon: const Icon(Icons.delete_outline, size: 14, color: Colors.red),
                            label: const Text('Delete', style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.red),
                              minimumSize: const Size(0, 32),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
          }),
        ],
      ),
    );
  }

  Widget _filterChip(String filterName, String count) {
    final isSelected = _selectedFilter == filterName;
    return ChoiceChip(
      label: Text('$filterName ($count)'),
      selected: isSelected,
      selectedColor: AquaTheme.primaryLight,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        color: isSelected ? AquaTheme.primary : AquaTheme.textSecondary,
      ),
      onSelected: (_) => setState(() => _selectedFilter = filterName),
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 2),
            Text(title, style: const TextStyle(fontSize: 11, color: AquaTheme.textSecondary), overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}
