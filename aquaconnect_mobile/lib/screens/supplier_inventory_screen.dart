import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/product_model.dart';
import '../providers/water_delivery_provider.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';

class SupplierInventoryScreen extends StatelessWidget {
  const SupplierInventoryScreen({super.key});

  void _showRefillBatchDialog(BuildContext context) {
    final countCtrl = TextEditingController(text: '50');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.water_damage, color: AquaTheme.primary),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Log Jar Refill Batch',
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
                const Text('Sanitize & fill empty jars from washing line into ready inventory:'),
                const SizedBox(height: 12),
                TextField(
                  controller: countCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Number of Cans Refilled', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AquaTheme.primary),
            onPressed: () {
              final count = int.tryParse(countCtrl.text) ?? 50;
              Provider.of<WaterDeliveryProvider>(context, listen: false).logRefillBatch(count);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Successfully logged refill batch of $count cans!')),
              );
            },
            child: const Text('Confirm Refill', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showReportDamageDialog(BuildContext context) {
    final countCtrl = TextEditingController(text: '1');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Report Damaged / Leaky Can'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Remove cracked or unusable water cans from active circulation:'),
                const SizedBox(height: 12),
                TextField(
                  controller: countCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Damaged Cans Count', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              final count = int.tryParse(countCtrl.text) ?? 1;
              Provider.of<WaterDeliveryProvider>(context, listen: false).reportDamagedCan(count);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Recorded $count damaged cans.')),
              );
            },
            child: const Text('Report Damaged', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showWriteOffDamagedDialog(BuildContext context) {
    final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
    if (waterData.damagedCans <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No damaged cans currently recorded!')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_sweep, color: Colors.red),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Write Off Damaged Cans',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text('Permanently clear all ${waterData.damagedCans} damaged cans from tracking records and scrap them?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              waterData.writeOffDamagedCans();
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Damaged cans written off and cleared from inventory.')),
              );
            },
            child: const Text('Write Off & Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showInventoryDeleteOptions(BuildContext context, ProductModel prod) {
    final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Manage Inventory: ${prod.name}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.remove_circle_outline, color: Colors.orange),
                title: const Text('Reset Available Stock to 0'),
                subtitle: const Text('Clear currently counted warehouse stock to zero'),
                onTap: () {
                  waterData.clearProductStock(prod.productId);
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Stock reset to 0 for ${prod.name}')),
                  );
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.delete_forever, color: Colors.red),
                title: const Text('Delete Product from Inventory', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                subtitle: const Text('Completely remove this item from catalog and tracking'),
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmDeleteProductFromInventory(context, prod);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDeleteProductFromInventory(BuildContext context, ProductModel prod) {
    final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Product Item'),
        content: Text('Are you sure you want to delete "${prod.name}" from inventory tracking?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              waterData.deleteProduct(prod.productId);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Removed "${prod.name}" from inventory.')),
              );
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showSetTotalCansDialog(BuildContext context) {
    final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
    final countCtrl = TextEditingController(text: '${waterData.totalCansOwned}');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.inventory_2, color: AquaTheme.primary),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Set Total Plant Cans',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
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
                const Text('Enter the total count of 20L water cans/jars owned by your plant facility:'),
                const SizedBox(height: 12),
                TextField(
                  controller: countCtrl,
                  keyboardType: TextInputType.number,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Total Cans Owned',
                    hintText: 'e.g. 100, 250, 500',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.water_drop),
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AquaTheme.primary),
            onPressed: () {
              final count = int.tryParse(countCtrl.text) ?? 0;
              waterData.setTotalCansOwned(count);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Total plant can inventory set to $count cans.')),
              );
            },
            child: const Text('Update Cans', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final waterData = Provider.of<WaterDeliveryProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text('Can Inventory & Asset Tracking'),
        ),
      ),
      body: ResponsiveLayout(
        maxWidth: 820,
        child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Section 9: Specialized Water Can Cycle Card
          Card(
            color: AquaTheme.primary,
            child: Padding(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'TOTAL JARS OWNED',
                          style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => _showSetTotalCansDialog(context),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(6)),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.edit, size: 12, color: Colors.white),
                              SizedBox(width: 4),
                              Text('Set / Edit Cans', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${waterData.totalCansOwned} Cans',
                    style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 16),

                  // Circulation Breakdown
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: _cycleColumn('Filled in Plant', '${waterData.filledInPlant}', Colors.lightBlue[100]!)),
                      const SizedBox(width: 4),
                      Expanded(child: _cycleColumn('With Customers', '${waterData.circulatingWithCustomers}', Colors.amber[200]!)),
                      const SizedBox(width: 4),
                      Expanded(child: _cycleColumn('Empty in Plant', '${waterData.emptyInPlant}', Colors.green[200]!)),
                      const SizedBox(width: 4),
                      Expanded(child: _cycleColumn('Damaged', '${waterData.damagedCans}', Colors.red[200]!)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Action Buttons: Refill, Damage, & Write Off
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.water_drop, size: 16, color: Colors.white),
                  label: const Text('Refill Batch', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  style: ElevatedButton.styleFrom(backgroundColor: AquaTheme.primary, padding: const EdgeInsets.symmetric(vertical: 12)),
                  onPressed: () => _showRefillBatchDialog(context),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.broken_image_outlined, size: 16, color: Colors.orange),
                  label: const Text('Add Damage', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.orange),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => _showReportDamageDialog(context),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.delete_sweep_outlined, size: 16, color: Colors.red),
                  label: Text(
                    waterData.damagedCans > 0 ? 'Clear (${waterData.damagedCans})' : 'Write-Off',
                    style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => _showWriteOffDamagedDialog(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Individual Products Stock
          const Text('STOCK IN WAREHOUSE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
          const SizedBox(height: 8),

          ...waterData.products.map((prod) {
            final isLow = prod.stock < 20;

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AquaTheme.primaryLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.inventory, color: AquaTheme.primary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(prod.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          Text(
                            'Stock: ${prod.stock} units • ${prod.containerType}',
                            style: TextStyle(
                              fontSize: 12,
                              color: isLow ? Colors.red : AquaTheme.textSecondary,
                              fontWeight: isLow ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle, color: AquaTheme.primary),
                      tooltip: '+20 Stock',
                      onPressed: () {
                        waterData.updateProductStock(prod.productId, prod.stock + 20);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Added 20 units to ${prod.name}')),
                        );
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      tooltip: 'Manage / Delete Stock',
                      onPressed: () => _showInventoryDeleteOptions(context, prod),
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

  Widget _cycleColumn(String label, String count, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(count, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: color)),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Colors.white70),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
