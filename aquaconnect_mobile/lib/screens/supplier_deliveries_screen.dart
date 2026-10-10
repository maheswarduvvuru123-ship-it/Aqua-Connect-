import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/water_delivery_provider.dart';
import '../models/order_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';

class SupplierDeliveriesScreen extends StatelessWidget {
  const SupplierDeliveriesScreen({super.key});

  void _showAssignDriverDialog(BuildContext context, OrderModel order) {
    final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Assign Driver for #${order.orderId}'),
        content: SingleChildScrollView(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 450),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: waterData.drivers.isEmpty
                  ? [
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16.0),
                        child: Text(
                          'No drivers registered in fleet yet. You can dispatch via Plant Self-Dispatch.',
                          style: TextStyle(color: AquaTheme.textSecondary),
                        ),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AquaTheme.primary),
                        onPressed: () {
                          waterData.assignDriver(order.orderId, 'Plant Self-Dispatch');
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Dispatched #${order.orderId} via Plant Self-Dispatch')),
                          );
                        },
                        child: const Text('Dispatch Order (Self)', style: TextStyle(color: Colors.white)),
                      ),
                    ]
                  : waterData.drivers.map((driver) {
                return ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AquaTheme.primaryLight,
                    child: Icon(Icons.person, color: AquaTheme.primary),
                  ),
                  title: Text(driver.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${driver.vehicleNumber} • ${driver.vehicleType}\nLoaded: ${driver.cansLoaded}/${driver.cansCapacity} cans'),
                  isThreeLine: true,
                  trailing: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AquaTheme.primary),
                    onPressed: () {
                      waterData.assignDriver(order.orderId, '${driver.name} (${driver.vehicleNumber})');
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Assigned #${order.orderId} to ${driver.name}')),
                      );
                    },
                    child: const Text('Assign', style: TextStyle(color: Colors.white, fontSize: 12)),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ],
      ),
    );
  }

  void _confirmDeleteDelivery(BuildContext context, WaterDeliveryProvider waterData, OrderModel delivery) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Delivery Record?'),
        content: Text(
          'Are you sure you want to permanently delete delivery record #${delivery.orderId} for ${delivery.customerName}?',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              waterData.deleteOrder(delivery.orderId);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Delivery #${delivery.orderId} deleted successfully.')),
              );
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _confirmClearDelivered(BuildContext context, WaterDeliveryProvider waterData, List<OrderModel> deliveredOrders) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.cleaning_services_outlined, color: Colors.red),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Clear Delivered Stops?',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          'Clear all ${deliveredOrders.length} delivered stops from the active dispatch fleet? This cleans up finished routes.',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              final ids = deliveredOrders.map((d) => d.orderId).toList();
              waterData.deleteOrders(ids);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Cleared ${ids.length} delivered stops from fleet.')),
              );
            },
            child: const Text('Clear All', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final waterData = Provider.of<WaterDeliveryProvider>(context);

    final supplierOrders = waterData.getOrdersForSupplier(
      user?.uid ?? '',
      supplierAddress: user?.address,
      supplierCity: user?.city,
      deliveryAreas: user?.deliveryAreas,
    );
    final activeDeliveries = supplierOrders.where((o) => o.orderStatus != 'Cancelled').toList();

    return Scaffold(
      appBar: AppBar(
        title: const FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text('Fleet & Delivery Dispatch'),
        ),
      ),
      body: ResponsiveLayout(
        maxWidth: 820,
        child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Drivers Fleet Status Overview
          const Text('ACTIVE FLEET & VEHICLES', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
          const SizedBox(height: 8),

          if (waterData.drivers.isEmpty)
            Card(
              elevation: 0,
              color: Colors.blueGrey[50],
              child: const Padding(
                padding: EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(Icons.directions_car_outlined, color: AquaTheme.textSecondary),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'No drivers registered in fleet yet. Orders can be dispatched directly.',
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            SizedBox(
              height: 140,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: waterData.drivers.length,
                itemBuilder: (context, index) {
                  final drv = waterData.drivers[index];
                  return Container(
                    width: 220,
                    margin: const EdgeInsets.only(right: 12),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(drv.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: drv.status == 'On Route' ? const Color(0xFFE0F2FE) : const Color(0xFFD1FAE5),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    drv.status,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: drv.status == 'On Route' ? AquaTheme.primary : Colors.green[800],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text('${drv.vehicleNumber} • ${drv.vehicleType}', style: const TextStyle(fontSize: 11, color: AquaTheme.textSecondary)),
                            const Spacer(),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${drv.cansLoaded}/${drv.cansCapacity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AquaTheme.primary)),
                                    const Text('Cans Loaded', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('${drv.activeOrdersCount}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                    const Text('Stops Active', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: 20),

          // Dispatch Stops List
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('DELIVERY DISPATCH & STOPS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
              if (activeDeliveries.any((d) => d.orderStatus == 'Delivered'))
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    visualDensity: VisualDensity.compact,
                  ),
                  icon: const Icon(Icons.delete_sweep, size: 16, color: Colors.red),
                  label: const Text('Clear Delivered', style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
                  onPressed: () => _confirmClearDelivered(context, waterData, activeDeliveries.where((d) => d.orderStatus == 'Delivered').toList()),
                ),
            ],
          ),
          const SizedBox(height: 8),

          if (activeDeliveries.isEmpty)
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: const Padding(
                padding: EdgeInsets.symmetric(vertical: 36.0, horizontal: 16.0),
                child: Column(
                  children: [
                    Icon(Icons.inventory_2_outlined, size: 40, color: AquaTheme.textSecondary),
                    SizedBox(height: 8),
                    Text('No Active Deliveries', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    SizedBox(height: 4),
                    Text('New orders placed by customers will appear here ready for dispatch.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary)),
                  ],
                ),
              ),
            )
          else
            ...activeDeliveries.map((delivery) {
            final isDelivered = delivery.orderStatus == 'Delivered';
            final isOut = delivery.orderStatus == 'Out for Delivery';

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
                        Text('#${delivery.orderId}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AquaTheme.primary)),
                        Chip(
                          label: Text(delivery.orderStatus),
                          backgroundColor: isDelivered ? const Color(0xFFD1FAE5) : const Color(0xFFE0F2FE),
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDelivered ? Colors.green[800] : AquaTheme.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text('Customer: ${waterData.getOrderCustomerDisplayName(delivery)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Text('📞 ${delivery.customerPhone}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                    Text('📍 Drop: ${delivery.deliveryAddress}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                    Text('📦 Cans: ${delivery.items.map((i) => "${i.name} x ${i.quantity}").join(", ")}',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.local_shipping, size: 16, color: AquaTheme.primary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Driver: ${delivery.deliveryPerson ?? "Unassigned"}',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AquaTheme.primary),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '₹${delivery.totalAmount.toStringAsFixed(0)} • ${delivery.paymentMethod}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (!isDelivered && !isOut)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  minimumSize: const Size(0, 32),
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () => _showAssignDriverDialog(context, delivery),
                                child: const Text('Assign', style: TextStyle(fontSize: 12)),
                              ),
                              const SizedBox(width: 6),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AquaTheme.primary,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  minimumSize: const Size(0, 32),
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () => waterData.updateOrderStatus(delivery.orderId, 'Out for Delivery'),
                                child: const Text('Dispatch', style: TextStyle(color: Colors.white, fontSize: 12)),
                              ),
                            ],
                          )
                        else if (isOut)
                          ElevatedButton.icon(
                            icon: const Icon(Icons.check, size: 14, color: Colors.white),
                            label: const Text('Delivered', style: TextStyle(color: Colors.white, fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              minimumSize: const Size(0, 32),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            onPressed: () => waterData.updateOrderStatus(delivery.orderId, 'Delivered'),
                          )
                        else if (isDelivered)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFD1FAE5),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.check_circle, size: 14, color: Colors.green),
                                    SizedBox(width: 4),
                                    Text('Delivered', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                icon: const Icon(Icons.delete_outline, size: 14, color: Colors.red),
                                label: const Text('Delete', style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Colors.red),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  minimumSize: const Size(0, 32),
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () => _confirmDeleteDelivery(context, waterData, delivery),
                              ),
                            ],
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
    ),
  );
}
}
