import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/water_delivery_provider.dart';
import '../providers/auth_provider.dart';
import '../models/order_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';

class CustomerOrdersScreen extends StatelessWidget {
  const CustomerOrdersScreen({super.key});

  void _showDriverCallDialog(BuildContext context, String driverName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.phone_in_talk, color: Colors.green),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Contact Driver',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Assigned Delivery Partner: $driverName', style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                const Text('Driver Phone: +91 98888 12345'),
                const SizedBox(height: 4),
                const Text('Vehicle: TS 09 AB 4521 (Tata Ace Water Mini-Truck)', style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary)),
                const SizedBox(height: 12),
                const Text('Estimated Arrival: Within 30 minutes', style: TextStyle(color: AquaTheme.primary, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            icon: const Icon(Icons.call, color: Colors.white, size: 16),
            label: const Text('Call Driver', style: TextStyle(color: Colors.white)),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Calling delivery driver +91 98888 12345...')),
              );
            },
          ),
        ],
      ),
    );
  }

  void _confirmCancelOrder(BuildContext context, WaterDeliveryProvider waterData, String orderId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.cancel_outlined, color: Colors.red),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Cancel Water Order',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text('Are you sure you want to cancel order #$orderId?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Keep Order'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              waterData.updateOrderStatus(orderId, 'Cancelled');
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Order #$orderId has been cancelled.')),
              );
            },
            child: const Text('Confirm Cancel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

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
          'Are you sure you want to permanently delete order #$orderId from your history? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Keep Record'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              waterData.deleteOrder(orderId);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Order #$orderId has been deleted from records.'),
                  backgroundColor: Colors.red[700],
                ),
              );
            },
            child: const Text('Delete Permanently', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final waterData = Provider.of<WaterDeliveryProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    // Filter orders for the active customer (Strictly excluding email test account orders)
    final myOrders = user == null
        ? <OrderModel>[]
        : waterData.orders.where((o) {
            if (WaterDeliveryProvider.isEmailAccountOrder(o)) return false;
            return o.customerId == user.uid || (user.email.isNotEmpty && o.customerId == user.email);
          }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Water Deliveries & Tracking'),
      ),
      body: ResponsiveLayout(
        maxWidth: 720,
        child: myOrders.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.water_drop_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No water orders yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text('Order sealed 20L mineral cans from our store tab.', style: TextStyle(color: AquaTheme.textSecondary)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: myOrders.length,
              itemBuilder: (context, index) {
                final order = myOrders[index];
                final isDelivered = order.orderStatus == 'Delivered';
                final isOut = order.orderStatus == 'Out for Delivery';
                final isConfirmed = order.orderStatus != 'Pending' && order.orderStatus != 'Cancelled';

                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Prominent Water Plant Name Header (Not cryptic AC1004)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE0F2FE),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.storefront, color: AquaTheme.primary, size: 22),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    WaterDeliveryProvider.sanitizePlantName(
                                      (order.plantName != null && WaterDeliveryProvider.isValidSupplierName(order.plantName!))
                                          ? order.plantName!
                                          : waterData.getSupplierName(order.supplierId)
                                    ),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 16,
                                      color: Color(0xFF0F172A),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Order #${order.orderId}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AquaTheme.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Chip(
                              label: Text(order.orderStatus),
                              backgroundColor: isDelivered ? const Color(0xFFD1FAE5) : const Color(0xFFE0F2FE),
                              labelStyle: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isDelivered ? Colors.green[800] : AquaTheme.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.verified, color: Colors.green, size: 14),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Fulfilling Plant: ${(order.plantName != null && WaterDeliveryProvider.isValidSupplierName(order.plantName!)) ? order.plantName! : waterData.getSupplierName(order.supplierId)} • Fresh Water Dispatched',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF166534)),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          order.items.map((i) => '${i.name} x ${i.quantity}').join(', '),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        Text('📍 Drop: ${order.deliveryAddress}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                        Text('🕒 Slot: ${order.deliveryTime}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                        const SizedBox(height: 14),

                        // Section 15: Visual Live Timeline Tracking
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('DELIVERY TIMELINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  _buildStep('Placed', true, Icons.check_circle),
                                  _buildStep('Confirmed', isConfirmed, Icons.thumb_up),
                                  _buildStep('Out for Delivery', isOut || isDelivered, Icons.local_shipping),
                                  _buildStep('Delivered', isDelivered, Icons.home),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Assigned Driver & Live Call
                        if (isOut && order.deliveryPerson != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE0F2FE),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const CircleAvatar(
                                      radius: 14,
                                      backgroundColor: AquaTheme.primary,
                                      child: Icon(Icons.person, size: 16, color: Colors.white),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      order.deliveryPerson!,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AquaTheme.primary),
                                    ),
                                  ],
                                ),
                                TextButton.icon(
                                  icon: const Icon(Icons.phone, size: 14, color: Colors.green),
                                  label: const Text('Call', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                                  onPressed: () => _showDriverCallDialog(context, order.deliveryPerson!),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '₹${order.totalAmount.toStringAsFixed(0)} • ${order.paymentMethod}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: order.paymentStatus == 'Paid' ? const Color(0xFFD1FAE5) : const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                order.paymentStatus == 'Paid' ? 'Paid ✓' : 'Payment Due',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: order.paymentStatus == 'Paid' ? Colors.green[800] : Colors.orange[900],
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (order.orderStatus != 'Delivered' && order.orderStatus != 'Cancelled') ...[
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton.icon(
                                icon: const Icon(Icons.cancel_outlined, size: 15, color: AquaTheme.danger),
                                label: const Text(
                                  'Cancel Order',
                                  style: TextStyle(color: AquaTheme.danger, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AquaTheme.danger),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  minimumSize: const Size(0, 32),
                                ),
                                onPressed: () => _confirmCancelOrder(context, waterData, order.orderId),
                              ),
                            ],
                          ),
                        ] else ...[
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton.icon(
                                icon: const Icon(Icons.delete_outline, size: 15, color: Colors.red),
                                label: const Text(
                                  'Delete Record',
                                  style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Colors.red),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  minimumSize: const Size(0, 32),
                                ),
                                onPressed: () => _confirmDeleteOrder(context, waterData, order.orderId),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
      ),
    );
  }

  Widget _buildStep(String title, bool isDone, IconData icon) {
    return Column(
      children: [
        Icon(
          icon,
          size: 20,
          color: isDone ? AquaTheme.primary : Colors.grey[400],
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(
            fontSize: 10,
            color: isDone ? AquaTheme.textMain : Colors.grey,
            fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
