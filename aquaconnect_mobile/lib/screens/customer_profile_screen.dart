import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';
import '../widgets/zomato_location_picker_dialog.dart';
import '../widgets/terms_privacy_dialog.dart';
import '../services/image_upload_service.dart';

class CustomerProfileScreen extends StatelessWidget {
  const CustomerProfileScreen({super.key});

  Future<void> _pickAndUploadCustomerPhoto(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    if (user == null) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
            SizedBox(width: 12),
            Text('Accessing album and updating profile photo...'),
          ],
        ),
        duration: Duration(seconds: 4),
      ),
    );

    final file = await ImageUploadService.pickFromGallery();
    if (file != null) {
      final url = await ImageUploadService.uploadImage(file, folder: 'user_profiles', fileIdentifier: user.uid);
      if (url != null) {
        auth.updateProfile(profileImage: url);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Profile photo updated from gallery and synced!'), backgroundColor: Colors.green),
          );
        }
      }
    }
  }

  void _showAddAddressDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    bool isDetecting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Add Delivery Address'),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 450),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.green),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: isDetecting
                              ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.my_location, size: 14, color: Colors.green),
                          label: const Text('GPS Detect', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
                          onPressed: isDetecting
                              ? null
                              : () async {
                                  setDlgState(() => isDetecting = true);
                                  final res = await autoDetectDeviceLocation();
                                  setDlgState(() => isDetecting = false);
                                  if (res != null) {
                                    addressCtrl.text = res.formattedAddress;
                                    if (titleCtrl.text.isEmpty) {
                                      titleCtrl.text = res.locality;
                                    }
                                  }
                                },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AquaTheme.primary),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(Icons.map_outlined, size: 14, color: AquaTheme.primary),
                          label: const Text('Pick on Map', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.primary)),
                          onPressed: () async {
                            final res = await showDialog<LocationResult>(
                              context: ctx,
                              builder: (_) => ZomatoLocationPickerDialog(
                                role: 'customer',
                                initialAddress: addressCtrl.text,
                              ),
                            );
                            if (res != null) {
                              addressCtrl.text = res.formattedAddress;
                              if (titleCtrl.text.isEmpty) {
                                titleCtrl.text = res.locality;
                              }
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: titleCtrl,
                    decoration: const InputDecoration(labelText: 'Address Label (e.g. Home, Office, Flat 402)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: addressCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Complete Street Address & Landmark', border: OutlineInputBorder()),
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
              final enteredAddr = addressCtrl.text.trim();
              if (enteredAddr.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter complete street address.')),
                );
                return;
              }
              final label = titleCtrl.text.trim();
              final fullAddress = label.isNotEmpty ? '$label: $enteredAddr' : enteredAddr;
              final auth = Provider.of<AuthProvider>(context, listen: false);
              auth.updateAddress(fullAddress);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Delivery address saved successfully!')),
              );
            },
            child: const Text('Save Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    ),
  );
}

  void _showEditAddressDialog(BuildContext context, String currentAddress) {
    final addressCtrl = TextEditingController(text: currentAddress);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Edit Delivery Address'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: addressCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Delivery Address & Landmark',
                    border: OutlineInputBorder(),
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
              final newAddr = addressCtrl.text.trim();
              if (newAddr.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Address cannot be empty.')),
                );
                return;
              }
              final auth = Provider.of<AuthProvider>(context, listen: false);
              auth.updateAddress(newAddr);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Delivery address updated successfully!')),
              );
            },
            child: const Text('Update Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Delivery Addresses'),
      ),
      body: ResponsiveLayout(
        maxWidth: 720,
        child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // User Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Stack(
                    children: [
                      InkWell(
                        onTap: () => _pickAndUploadCustomerPhoto(context),
                        borderRadius: BorderRadius.circular(30),
                        child: CircleAvatar(
                          radius: 30,
                          backgroundColor: AquaTheme.primaryLight,
                          child: (user?.profileImage != null && user!.profileImage!.isNotEmpty)
                              ? ClipOval(
                                  child: ImageUploadService.buildImageWidget(
                                    user.profileImage,
                                    width: 60,
                                    height: 60,
                                    fit: BoxFit.cover,
                                  ),
                                )
                              : const Icon(Icons.person, size: 36, color: AquaTheme.primary),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: AquaTheme.primary,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt, size: 12, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name.isNotEmpty == true ? user!.name : (user?.email.split('@').first ?? 'Customer'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        if (user?.phone.isNotEmpty == true) ...[
                          const SizedBox(height: 2),
                          Text(user!.phone, style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 13)),
                        ],
                        Text(user?.email ?? '', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Saved Delivery Addresses (Section 18)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('SAVED DELIVERY ADDRESSES', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
              TextButton.icon(
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add Address', style: TextStyle(fontSize: 12)),
                onPressed: () => _showAddAddressDialog(context),
              ),
            ],
          ),
          const SizedBox(height: 4),

          Card(
            child: ListTile(
              leading: const Icon(Icons.location_on, color: AquaTheme.primary),
              title: const Text('Registered Delivery Address', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text((user?.address?.isNotEmpty == true) ? user!.address! : 'No address saved yet. Tap "Add Address" to save your delivery location.'),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Chip(label: Text('Primary', style: TextStyle(fontSize: 10)), backgroundColor: Color(0xFFE0F2FE)),
                  if (user?.address?.isNotEmpty == true)
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 18, color: AquaTheme.primary),
                      tooltip: 'Edit Address',
                      onPressed: () => _showEditAddressDialog(context, user!.address!),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Emergency App Support Contact Card
          Card(
            color: const Color(0xFFF0FDF4),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFF86EFAC)),
            ),
            child: const Padding(
              padding: EdgeInsets.all(16.0),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Color(0xFF16A34A),
                    radius: 22,
                    child: Icon(Icons.phone_in_talk, color: Colors.white, size: 22),
                  ),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Emergency App Support', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF166534))),
                        SizedBox(height: 2),
                        Text('Helpline: 8522828688 (24x7 Assistance)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF15803D))),
                        SizedBox(height: 2),
                        Text('Call for immediate plant dispatch & order assistance', style: TextStyle(fontSize: 11, color: Color(0xFF166534))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Platform Policies & Terms Card
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFEFF6FF),
                child: Icon(Icons.policy_outlined, color: AquaTheme.primary),
              ),
              title: const Text('Terms of Service & Privacy Policy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('IS 14543 standards, 20L can deposit & data rights', style: TextStyle(fontSize: 11, color: Colors.grey)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
              onTap: () => showTermsPrivacyDialog(context),
            ),
          ),
          const SizedBox(height: 20),

          // Danger Zone: Delete Account
          Card(
            color: const Color(0xFFFEF2F2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFFECACA)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.red, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Danger Zone: Delete Account',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.red),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Permanently delete your Aqua connect customer account, delivery addresses, and personal profile from our live database. This action is irreversible.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF7F1D1D), height: 1.4),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                        foregroundColor: Colors.red,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.delete_forever, size: 18),
                      label: const Text('Delete My Customer Account', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: () => _confirmDeleteAccount(context),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Sign Out button
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AquaTheme.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.logout, color: Colors.white),
            label: const Text('Sign Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
    ),
  );
}

void _confirmDeleteAccount(BuildContext context) {
  final auth = Provider.of<AuthProvider>(context, listen: false);
  final user = auth.currentUser;

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
          SizedBox(width: 10),
          Expanded(
            child: Text('Permanently Delete Account?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      content: Text(
        'Are you sure you want to permanently delete your Aqua connect customer account (${user?.email ?? ""})?\n\n'
        'All your delivery addresses, personal profile, and order records will be completely removed from our live databases. This operation is irreversible.',
        style: const TextStyle(fontSize: 13, height: 1.4),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red.shade700,
            foregroundColor: Colors.white,
          ),
          onPressed: () async {
            Navigator.pop(ctx);
            final err = await auth.deleteAccount();
            if (context.mounted) {
              if (err != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(err), backgroundColor: Colors.red),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Your customer account and personal data were permanently deleted.'),
                    backgroundColor: Colors.black87,
                  ),
                );
              }
            }
          },
          child: const Text('Yes, Delete Account', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    ),
  );
}
}
