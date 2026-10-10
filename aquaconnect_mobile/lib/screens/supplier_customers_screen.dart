import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/water_delivery_provider.dart';
import '../models/customer_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';

class SupplierCustomersScreen extends StatelessWidget {
  const SupplierCustomersScreen({super.key});

  void _showClearDuesDialog(BuildContext context, CustomerModel cust) {
    final amountCtrl = TextEditingController(text: cust.duesAmount.toStringAsFixed(0));

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Clear Dues for ${cust.name}'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current Pending Dues: ₹${cust.duesAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Amount Paid (₹)', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () {
              final amt = double.tryParse(amountCtrl.text) ?? cust.duesAmount;
              Provider.of<WaterDeliveryProvider>(context, listen: false).clearCustomerDues(cust.id, amt);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Recorded payment of ₹${amt.toStringAsFixed(0)} from ${cust.name}')),
              );
            },
            child: const Text('Confirm Payment', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showReturnCansDialog(BuildContext context, CustomerModel cust) {
    final countCtrl = TextEditingController(text: '${cust.cansHeld > 0 ? 1 : 0}');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Collect Empty Cans from ${cust.name}'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current Cans Held by Customer: ${cust.cansHeld}', style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(
                  controller: countCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Empty Cans Collected', border: OutlineInputBorder()),
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
              final count = int.tryParse(countCtrl.text) ?? 1;
              Provider.of<WaterDeliveryProvider>(context, listen: false).returnCustomerCans(cust.id, count);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Collected $count empty cans from ${cust.name}')),
              );
            },
            child: const Text('Record Return', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteCustomer(BuildContext context, CustomerModel cust) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Customer Record?'),
        content: Text(
          'Are you sure you want to delete customer record for "${cust.name}"? This removes their ledger, held can balances, and directory entry.',
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
              Provider.of<WaterDeliveryProvider>(context, listen: false).deleteCustomer(cust.id);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Customer "${cust.name}" deleted successfully.')),
              );
            },
            child: const Text('Delete Customer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAll(BuildContext context, List<CustomerModel> customers) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Delete All Customers?',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to delete all ${customers.length} customer records in your directory? This will remove all their active ledgers and order records.',
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
              final ids = customers.map((c) => c.id).toList();
              Provider.of<WaterDeliveryProvider>(context, listen: false).deleteAllCustomers(ids);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Deleted all ${ids.length} customers successfully.')),
              );
            },
            child: const Text('Delete All', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final waterData = Provider.of<WaterDeliveryProvider>(context);

    final supplierCustomers = waterData.getCustomersForSupplier(
      auth.currentUser?.uid ?? '',
      supplierAddress: auth.currentUser?.address,
      supplierCity: auth.currentUser?.city,
      deliveryAreas: auth.currentUser?.deliveryAreas,
    );

    return Scaffold(
      appBar: AppBar(
        title: const FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text('Customer Directory & Can Ledgers'),
        ),
        actions: [
          if (supplierCustomers.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep, color: Colors.red),
              tooltip: 'Delete All Customers',
              onPressed: () => _confirmDeleteAll(context, supplierCustomers),
            ),
        ],
      ),
      body: ResponsiveLayout(
        maxWidth: 820,
        child: supplierCustomers.isEmpty
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text('No Customers in Your Delivery Range', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      SizedBox(height: 8),
                      Text('Customers will appear here when they register in your service locality or place water orders with your plant.', textAlign: TextAlign.center, style: TextStyle(color: AquaTheme.textSecondary)),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16.0),
                itemCount: supplierCustomers.length,
                itemBuilder: (context, index) {
                final cust = supplierCustomers[index];
                final hasDues = cust.duesAmount > 0;

          return Card(
            margin: const EdgeInsets.only(bottom: 14),
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
                              cust.name,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '${cust.type} • 📞 ${cust.phone}',
                              style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: hasDues ? Colors.red[50] : Colors.green[50],
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          hasDues ? 'Dues: ₹${cust.duesAmount.toStringAsFixed(0)}' : 'No Dues ✓',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: hasDues ? Colors.red[800] : Colors.green[800],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('📍 ${cust.address}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                  const SizedBox(height: 12),

                  // Can Balance Badges
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CANS HELD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                              Text('${cust.cansHeld} Cans', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AquaTheme.primary)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('DEPOSIT HELD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                              Text('₹${cust.depositHeld.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('TOTAL DELIVERED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                              Text('${cust.totalCansDelivered} Cans', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20),

                  // Actions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.redAccent),
                          minimumSize: const Size(0, 32),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        icon: const Icon(Icons.delete_outline, size: 16, color: Colors.red),
                        label: const Text('Delete', style: TextStyle(fontSize: 12, color: Colors.red)),
                        onPressed: () => _confirmDeleteCustomer(context, cust),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 32),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        icon: const Icon(Icons.keyboard_return, size: 16),
                        label: const Text('Return Cans', style: TextStyle(fontSize: 12)),
                        onPressed: () => _showReturnCansDialog(context, cust),
                      ),
                      if (hasDues) ...[
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.payment, size: 16, color: Colors.white),
                          label: const Text('Clear Dues', style: TextStyle(color: Colors.white, fontSize: 12)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            minimumSize: const Size(0, 32),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          onPressed: () => _showClearDuesDialog(context, cust),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    ),
  );
}
}
