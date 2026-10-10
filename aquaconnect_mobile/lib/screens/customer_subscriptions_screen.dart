import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/water_delivery_provider.dart';
import '../providers/auth_provider.dart';
import '../models/subscription_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';

class CustomerSubscriptionsScreen extends StatelessWidget {
  const CustomerSubscriptionsScreen({super.key});

  void _showSubscriptionFormDialog(BuildContext context, {SubscriptionModel? existingSub}) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
    final user = auth.currentUser;
    final customerAddress = (user?.address?.isNotEmpty == true) ? user!.address! : 'Primary Address';

    // Retrieve nearby certified water plants for this customer
    final nearbyPlants = waterData.getSurroundingSuppliers(customerAddress, user?.city);

    int intervalDays = existingSub?.intervalDays ?? 2;
    String selectedFrequency = existingSub?.frequency ?? 'Every 2 Days';
    String selectedSlot = existingSub?.deliverySlot ?? 'Morning (07:00 AM - 10:00 AM)';
    int quantity = existingSub?.quantity ?? 2;

    String? selectedPlantId = (existingSub != null && nearbyPlants.any((p) => p.uid == existingSub.supplierId))
        ? existingSub.supplierId
        : (nearbyPlants.isNotEmpty ? nearbyPlants.first.uid : null);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) {
          final isEditing = existingSub != null;

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Icon(isEditing ? Icons.edit_calendar : Icons.autorenew, color: AquaTheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isEditing ? 'Edit Auto-Refill Schedule' : 'Setup Auto-Delivery',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            content: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isEditing
                          ? 'Update your delivery cycle days, fulfilling plant, or can quantity.'
                          : 'Never run out of pure drinking water. Choose your cycle and fulfilling plant.',
                      style: const TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                    ),
                    const SizedBox(height: 14),

                    // 1. DELIVERY FREQUENCY & DAYS SELECTOR
                    const Text(
                      'DELIVERY CYCLE & DAYS',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int>(
                      isExpanded: true,
                      initialValue: [1, 2, 3, 4, 5, 7].contains(intervalDays) ? intervalDays : 2,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        prefixIcon: const Icon(Icons.repeat, color: AquaTheme.primary, size: 20),
                      ),
                      items: const [
                        DropdownMenuItem(value: 1, child: Text('Every Day (Daily 1 Day Drop)', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 2, child: Text('Every 2 Days (Alternate Day Drop)', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 3, child: Text('Every 3 Days (2 Drops per Week)', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 4, child: Text('Every 4 Days', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 5, child: Text('Every 5 Days', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 7, child: Text('Every 7 Days (Weekly Drop)', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            intervalDays = val;
                            if (val == 1) {
                              selectedFrequency = 'Every Day';
                            } else if (val == 2) {
                              selectedFrequency = 'Every 2 Days';
                            } else if (val == 7) {
                              selectedFrequency = 'Weekly (Every 7 Days)';
                            } else {
                              selectedFrequency = 'Every $val Days';
                            }
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 8),

                    // Custom Days Stepper
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Custom Day Interval:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              Text('Drop water every $intervalDays days', style: const TextStyle(fontSize: 12, color: AquaTheme.primary, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, size: 22),
                                onPressed: intervalDays > 1
                                    ? () => setState(() {
                                          intervalDays--;
                                          selectedFrequency = intervalDays == 1 ? 'Every Day' : 'Every $intervalDays Days';
                                        })
                                    : null,
                              ),
                              Text('$intervalDays d', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: AquaTheme.primary, size: 22),
                                onPressed: intervalDays < 30
                                    ? () => setState(() {
                                          intervalDays++;
                                          selectedFrequency = 'Every $intervalDays Days';
                                        })
                                    : null,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 2. FULFILLING NEARBY WATER PLANT SELECTOR (when 2 or more available)
                    const Text(
                      'FULFILLING NEARBY WATER PLANT',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                    ),
                    const SizedBox(height: 6),

                    if (nearbyPlants.length >= 2) ...[
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
                            value: (selectedPlantId != null && nearbyPlants.any((p) => p.uid == selectedPlantId))
                                ? selectedPlantId
                                : nearbyPlants.first.uid,
                            items: nearbyPlants.map((plant) {
                              final dist = waterData.getEstimatedDistance(plant, customerAddress);
                              return DropdownMenuItem<String>(
                                value: plant.uid,
                                child: Text(
                                  '🏭 ${plant.name} • $dist',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => selectedPlantId = val);
                              }
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '✓ ${nearbyPlants.length} certified plants service your locality. Switch anytime.',
                        style: const TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.w600),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.verified, color: Colors.green, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                nearbyPlants.isNotEmpty
                                    ? '🏭 ${nearbyPlants.first.name} (Direct Delivery)'
                                    : '🏭 AquaConnect Certified Water Plant (Local Hub)',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF166534)),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),

                    // 3. CANS PER DROP
                    const Text('CANS PER DELIVERY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: quantity > 1 ? () => setState(() => quantity--) : null,
                        ),
                        Text('$quantity x 20L Water Can', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, color: AquaTheme.primary),
                          onPressed: () => setState(() => quantity++),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // 4. DELIVERY TIME SLOT
                    const Text('PREFERRED TIME SLOT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      initialValue: selectedSlot,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Morning (07:00 AM - 10:00 AM)', child: Text('Morning 7:00 AM - 10:00 AM', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'Afternoon (12:00 PM - 03:00 PM)', child: Text('Afternoon 12:00 PM - 3:00 PM', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'Evening (05:00 PM - 08:00 PM)', child: Text('Evening 5:00 PM - 8:00 PM', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => selectedSlot = val);
                      },
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
                  // Resolve chosen plant
                  final chosenPlant = nearbyPlants.where((p) => p.uid == selectedPlantId).firstOrNull ??
                      (nearbyPlants.isNotEmpty ? nearbyPlants.first : null);

                  final plantName = chosenPlant?.name ?? 'AquaConnect Certified Water Plant';
                  final supplierId = chosenPlant?.uid ?? '';

                  if (isEditing) {
                    final updated = SubscriptionModel(
                      id: existingSub.id,
                      customerId: existingSub.customerId,
                      customerName: existingSub.customerName,
                      productName: existingSub.productName,
                      quantity: quantity,
                      frequency: selectedFrequency,
                      intervalDays: intervalDays,
                      deliverySlot: selectedSlot,
                      address: existingSub.address,
                      supplierId: supplierId,
                      plantName: plantName,
                      isActive: existingSub.isActive,
                      nextDeliveryDate: 'In $intervalDays days, 07:30 AM',
                    );
                    waterData.updateSubscription(updated);
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Plan Updated: Every $intervalDays days from $plantName'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  } else {
                    final newSub = SubscriptionModel(
                      id: 'sub_${DateTime.now().millisecondsSinceEpoch}',
                      customerId: user?.uid ?? 'cust_${DateTime.now().millisecondsSinceEpoch}',
                      customerName: (user?.name.isNotEmpty == true) ? user!.name : 'Customer',
                      productName: '20L Water Can',
                      quantity: quantity,
                      frequency: selectedFrequency,
                      intervalDays: intervalDays,
                      deliverySlot: selectedSlot,
                      address: customerAddress,
                      supplierId: supplierId,
                      plantName: plantName,
                      isActive: true,
                      nextDeliveryDate: 'Tomorrow, 07:30 AM',
                    );
                    waterData.addSubscription(newSub);
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Auto-Refill Activated: Every $intervalDays days from $plantName!'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  }
                },
                child: Text(
                  isEditing ? 'Save Changes' : 'Activate Plan',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDeleteSubscription(BuildContext context, WaterDeliveryProvider waterData, String subId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Auto-Refill Plan?'),
        content: const Text('Are you sure you want to delete this automated water delivery subscription?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep Plan')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              waterData.deleteSubscription(subId);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Auto-Refill plan removed.')),
              );
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
        title: const Text('Auto-Refill & Subscriptions'),
      ),
      body: ResponsiveLayout(
        maxWidth: 720,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Banner
            const Card(
              color: Color(0xFFE0F2FE),
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(Icons.autorenew, color: AquaTheme.primary, size: 36),
                    SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Automated Water Subscriptions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          SizedBox(height: 2),
                          Text('Never worry about empty cans. Set a schedule, choose nearby plants, and edit anytime.', style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('ACTIVE AUTO-REFILL PLANS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                Text('Auto Dispatch Enabled', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
              ],
            ),
            const SizedBox(height: 8),

            if (waterData.subscriptions.isEmpty) ...[
              Card(
                elevation: 0,
                color: const Color(0xFFF8FAFC),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade300),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20.0),
                  child: Column(
                    children: [
                      Icon(Icons.water_drop_outlined, size: 56, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      const Text(
                        'No Active Auto-Refill Plans',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Set up automated doorstep drops every 1, 2, 3, or more days from your nearest certified plant.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: AquaTheme.primary),
                        icon: const Icon(Icons.add, color: Colors.white, size: 18),
                        label: const Text('Setup Auto-Refill', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        onPressed: () => _showSubscriptionFormDialog(context),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              ...waterData.subscriptions.map((sub) {
                final plantDisplayName = WaterDeliveryProvider.sanitizePlantName(
                  (sub.plantName != null && WaterDeliveryProvider.isValidSupplierName(sub.plantName!))
                      ? sub.plantName!
                      : waterData.getSupplierName(sub.supplierId ?? '')
                );

                return Card(
                  margin: const EdgeInsets.only(bottom: 14),
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Card Header: Quantity, Product & Active Switch
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${sub.quantity} x ${sub.productName}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Row(
                              children: [
                                Text(
                                  sub.isActive ? 'Active' : 'Paused',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: sub.isActive ? Colors.green[800] : Colors.grey,
                                  ),
                                ),
                                Switch(
                                  value: sub.isActive,
                                  activeThumbColor: AquaTheme.primary,
                                  onChanged: (_) {
                                    waterData.toggleSubscription(sub.id);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(sub.isActive ? 'Subscription Paused' : 'Subscription Resumed')),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),

                        // Fulfilling Water Plant Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.storefront, color: Colors.green, size: 16),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Fulfilling Plant: $plantDisplayName',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF166534)),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Schedule and Slot Info
                        Row(
                          children: [
                            const Icon(Icons.repeat, size: 16, color: AquaTheme.primary),
                            const SizedBox(width: 6),
                            Text(
                              'Cycle: Every ${sub.intervalDays} Days (${sub.frequency})',
                              style: const TextStyle(fontWeight: FontWeight.w600, color: AquaTheme.primary, fontSize: 13),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.access_time, size: 16, color: AquaTheme.textSecondary),
                            const SizedBox(width: 6),
                            Text('Slot: ${sub.deliverySlot}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 16, color: AquaTheme.textSecondary),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Address: ${sub.address}',
                                style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 20),

                        // Action Bar: Edit Plan, Next Drop, Delete
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                sub.isActive ? 'Next Drop: ${sub.nextDeliveryDate}' : 'Status: Paused',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: sub.isActive ? Colors.green[800] : Colors.grey,
                                ),
                              ),
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Edit Plan Button
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFE0F2FE),
                                    foregroundColor: AquaTheme.primary,
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    minimumSize: const Size(0, 32),
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  icon: const Icon(Icons.edit_calendar, size: 15),
                                  label: const Text('Edit Plan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  onPressed: () => _showSubscriptionFormDialog(context, existingSub: sub),
                                ),
                                const SizedBox(width: 8),

                                // Delete Plan Button
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  tooltip: 'Delete Plan',
                                  onPressed: () => _confirmDeleteSubscription(context, waterData, sub.id),
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
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AquaTheme.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Auto-Refill', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _showSubscriptionFormDialog(context),
      ),
    );
  }
}
