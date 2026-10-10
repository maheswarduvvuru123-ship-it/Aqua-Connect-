import '../models/order_model.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/water_delivery_provider.dart';
import '../providers/auth_provider.dart';
import '../models/customer_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';

class CustomerReportsScreen extends StatelessWidget {
  const CustomerReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final waterData = Provider.of<WaterDeliveryProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    // Find current customer details or provide empty account passbook
    CustomerModel? cust;
    for (final c in waterData.customers) {
      if (c.id == user?.uid || (user != null && user.email.isNotEmpty && c.email == user.email)) {
        cust = c;
        break;
      }
    }
    final effectiveCust = cust ?? CustomerModel(
      id: user?.uid ?? 'cust_active',
      name: user?.name ?? 'Customer',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
      address: user?.address ?? '',
      type: 'Residential',
      cansHeld: 0,
      depositHeld: 0.0,
      duesAmount: 0.0,
      totalOrdersCount: 0,
      totalCansDelivered: 0,
      totalCansReturned: 0,
    );

    // Filter customer orders dynamically for real monthly consumption
    final customerOrders = waterData.orders.where((o) =>
      o.customerId == user?.uid ||
      (user != null && user.email.isNotEmpty && (o.customerId == user.email || o.customerName == user.name)) ||
      (user != null && user.phone.isNotEmpty && o.customerPhone == user.phone) ||
      (user != null && user.name.isNotEmpty && o.customerName.toLowerCase() == user.name.toLowerCase())
    ).toList();

    final deliveredOrders = customerOrders.where((o) => o.orderStatus == 'Delivered').toList();
    final actualDeliveredCansFromOrders = deliveredOrders.fold<int>(
      0,
      (sum, o) => sum + o.items.fold<int>(0, (iSum, it) => iSum + it.quantity)
    );
    final actualTotalOrdersCount = customerOrders.isNotEmpty ? customerOrders.length : effectiveCust.totalOrdersCount;
    final actualTotalCansDelivered = actualDeliveredCansFromOrders > 0 ? actualDeliveredCansFromOrders : effectiveCust.totalCansDelivered;
    final actualLitresDrank = actualTotalCansDelivered * 20;

    final Map<String, List<OrderModel>> monthlyOrders = {};
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    for (final order in customerOrders) {
      final mName = monthNames[order.createdAt.month];
      final key = '$mName ${order.createdAt.year}';
      monthlyOrders.putIfAbsent(key, () => []).add(order);
    }

    final customerTransactions = waterData.canTransactions.where((tx) =>
      tx.customerId == user?.uid || (user != null && user.email.isNotEmpty && tx.customerId == user.email)
    ).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Can Passbook & Consumption'),
      ),
      body: ResponsiveLayout(
        maxWidth: 720,
        child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Section 16: Empty Can Balance Card
          Card(
            color: AquaTheme.primary,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'MY WATER CAN PASSBOOK',
                        style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(6)),
                        child: const Text('Jar Ledger', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${effectiveCust.cansHeld} Cans at Home',
                    style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Refundable Can Deposit Held: ₹${effectiveCust.depositHeld.toStringAsFixed(0)}',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _passbookStat('Total Delivered', '$actualTotalCansDelivered Cans'),
                      _passbookStat('Total Returned', '${effectiveCust.totalCansReturned} Cans'),
                      _passbookStat('Current Balance', '${effectiveCust.cansHeld} Cans'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Key metrics (Dynamically reflects delivered cans & orders)
          Row(
            children: [
              Expanded(child: _metricCard('Total Orders', '$actualTotalOrdersCount', Icons.shopping_bag, Colors.indigo)),
              const SizedBox(width: 10),
              Expanded(child: _metricCard('Dues Pending', '₹${effectiveCust.duesAmount.toStringAsFixed(0)}', Icons.payment, effectiveCust.duesAmount > 0 ? Colors.red : Colors.green)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _metricCard('Litres Drank', '${actualLitresDrank}L', Icons.water_drop, Colors.blue)),
              const SizedBox(width: 10),
              Expanded(child: _metricCard('Purity Grade', '100% RO+UV', Icons.verified, Colors.teal)),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Can Transactions Ledger
          const Text('CAN EXCHANGE HISTORY (PASSBOOK)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
          const SizedBox(height: 8),

          Card(
            child: customerTransactions.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(24.0),
                    child: Center(
                      child: Text(
                        'No can exchange transactions recorded yet.',
                        style: TextStyle(color: AquaTheme.textSecondary, fontSize: 13),
                      ),
                    ),
                  )
                : Column(
                    children: customerTransactions.map((tx) {
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: tx.type == 'Delivered' ? const Color(0xFFE0F2FE) : const Color(0xFFD1FAE5),
                    child: Icon(
                      tx.type == 'Delivered' ? Icons.local_shipping : Icons.keyboard_return,
                      color: tx.type == 'Delivered' ? AquaTheme.primary : Colors.green[800],
                      size: 20,
                    ),
                  ),
                  title: Text(
                    tx.type == 'Delivered'
                        ? '+${tx.cansDelivered} Delivered (-${tx.cansReturned} Exchanged)'
                        : '-${tx.cansReturned} Empty Cans Returned',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  subtitle: Text(
                    '${tx.date.toLocal().toString().split(" ")[0]} • Running Balance: ${tx.runningBalance} cans',
                    style: const TextStyle(fontSize: 11, color: AquaTheme.textSecondary),
                  ),
                  trailing: Text(
                    tx.type == 'Delivered' ? '+${tx.cansDelivered - tx.cansReturned}' : '-${tx.cansReturned}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: tx.type == 'Delivered' ? AquaTheme.primary : Colors.green[800],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),

          // Monthly Consumption (Calculated Dynamically from Real Orders - No Dummy Data)
          const Text('MONTHLY WATER CONSUMPTION', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: monthlyOrders.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20.0),
                      child: Center(
                        child: Text(
                          'No monthly water consumption recorded yet.',
                          style: TextStyle(color: AquaTheme.textSecondary, fontSize: 13),
                        ),
                      ),
                    )
                  : Column(
                      children: monthlyOrders.entries.map((entry) {
                        final orders = entry.value;
                        final totalAmt = orders.fold<double>(0.0, (acc, o) => acc + o.totalAmount);
                        final totalCans = orders.fold<int>(0, (acc, o) => acc + o.items.where((i) => i.name.contains('Can')).fold<int>(0, (iAcc, it) => iAcc + it.quantity));
                        final totalLitres = totalCans * 20;

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6.0),
                          child: _MonthlyRow(
                            month: entry.key,
                            amount: '₹${totalAmt.toStringAsFixed(0)}',
                            cans: '$totalCans Cans (${totalLitres}L)',
                          ),
                        );
                      }).toList(),
                    ),
            ),
          ),
        ],
      ),
    ),
  );
}

  Widget _passbookStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.white70)),
      ],
    );
  }

  Widget _metricCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 2),
            Text(title, style: const TextStyle(fontSize: 12, color: AquaTheme.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _MonthlyRow extends StatelessWidget {
  final String month;
  final String amount;
  final String cans;

  const _MonthlyRow({required this.month, required this.amount, required this.cans});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(month, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Text(cans, style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(amount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AquaTheme.primary)),
      ],
    );
  }
}
