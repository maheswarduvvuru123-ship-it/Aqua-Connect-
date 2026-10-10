import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';
import '../widgets/zomato_location_picker_dialog.dart';
import '../services/image_upload_service.dart';

class SupplierProfileScreen extends StatefulWidget {
  const SupplierProfileScreen({super.key});

  @override
  State<SupplierProfileScreen> createState() => _SupplierProfileScreenState();
}

class _SupplierProfileScreenState extends State<SupplierProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _businessNameCtrl;
  late TextEditingController _ownerNameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _gstCtrl;
  final TextEditingController _zoneInputCtrl = TextEditingController();

  List<String> _deliveryAreas = [];
  bool _isSaving = false;
  bool _initialized = false;
  bool _isDetectingPlantGps = false;
  bool _isDetectingZoneGps = false;

  String _openingTime = '06:00 AM';
  String _closingTime = '09:00 PM';
  late TextEditingController _operatingHoursCtrl;
  bool _isOpenToday = true;
  String? _plantPhotoUrl;
  bool _isUploadingPhoto = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
      _businessNameCtrl = TextEditingController(text: user?.name.isNotEmpty == true ? user!.name : '');
      _ownerNameCtrl = TextEditingController(text: user?.name.isNotEmpty == true ? user!.name : '');
      _phoneCtrl = TextEditingController(text: user?.phone ?? '');
      _addressCtrl = TextEditingController(text: user?.address ?? '');
      _cityCtrl = TextEditingController(text: user?.city ?? 'Hyderabad');
      _gstCtrl = TextEditingController(text: user?.gstNumber ?? '');
      _deliveryAreas = List<String>.from(user?.deliveryAreas ?? []);
      _openingTime = user?.openingTime ?? '06:00 AM';
      _closingTime = user?.closingTime ?? '09:00 PM';
      _operatingHoursCtrl = TextEditingController(text: user?.operatingHours ?? '6:00 AM - 9:00 PM');
      _isOpenToday = user?.isOpenToday ?? true;
      final curImg = user?.profileImage;
      _plantPhotoUrl = (curImg != null && curImg.isNotEmpty && !curImg.contains('1544816155-12df9643f363'))
          ? curImg
          : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80';
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _ownerNameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _gstCtrl.dispose();
    _zoneInputCtrl.dispose();
    _operatingHoursCtrl.dispose();
    super.dispose();
  }

  Future<void> _detectPlantGps() async {
    setState(() => _isDetectingPlantGps = true);
    final res = await autoDetectDeviceLocation();
    setState(() => _isDetectingPlantGps = false);

    if (!mounted) return;

    if (res != null) {
      setState(() {
        _addressCtrl.text = res.formattedAddress;
        if (res.city.isNotEmpty) {
          _cityCtrl.text = res.city;
        }
        final zoneName = res.locality.isNotEmpty ? res.locality : res.city;
        if (zoneName.isNotEmpty && !_deliveryAreas.any((a) => a.toLowerCase() == zoneName.toLowerCase())) {
          _deliveryAreas.add(zoneName);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Plant location detected: ${res.locality}, ${res.city}'),
          backgroundColor: Colors.green[800],
          duration: const Duration(seconds: 3),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ GPS permission not granted or location service off. Please pick on map.'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
      await _pickPlantOnMap();
    }
  }

  Future<void> _pickPlantOnMap() async {
    final res = await showDialog<LocationResult>(
      context: context,
      builder: (ctx) => ZomatoLocationPickerDialog(
        role: 'supplier',
        initialAddress: _addressCtrl.text,
      ),
    );

    if (res != null && mounted) {
      setState(() {
        _addressCtrl.text = res.formattedAddress;
        if (res.city.isNotEmpty) {
          _cityCtrl.text = res.city;
        }
        final zoneName = res.locality.isNotEmpty ? res.locality : res.city;
        if (zoneName.isNotEmpty && !_deliveryAreas.any((a) => a.toLowerCase() == zoneName.toLowerCase())) {
          _deliveryAreas.add(zoneName);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Plant location updated: ${res.locality}, ${res.city}'),
          backgroundColor: Colors.green[800],
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _addZoneFromGps() async {
    setState(() => _isDetectingZoneGps = true);
    final res = await autoDetectDeviceLocation();
    setState(() => _isDetectingZoneGps = false);

    if (!mounted) return;

    if (res != null) {
      final zoneName = res.locality.isNotEmpty ? res.locality : res.city;
      setState(() {
        if (!_deliveryAreas.any((a) => a.toLowerCase() == zoneName.toLowerCase())) {
          _deliveryAreas.add(zoneName);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ Added "$zoneName" to serviced delivery zones!'),
          backgroundColor: Colors.green[800],
          duration: const Duration(seconds: 3),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ GPS permission not granted. Please pick delivery zone on map.'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
      await _addZoneFromMap();
    }
  }

  Future<void> _addZoneFromMap() async {
    final typed = _zoneInputCtrl.text.trim();
    final res = await showDialog<LocationResult>(
      context: context,
      builder: (ctx) => ZomatoLocationPickerDialog(
        role: 'supplier',
        initialAddress: typed.isNotEmpty ? typed : (_addressCtrl.text.trim().isNotEmpty ? _addressCtrl.text.trim() : null),
      ),
    );

    if (res != null && mounted) {
      final zoneName = res.locality.isNotEmpty ? res.locality : res.city;
      setState(() {
        if (!_deliveryAreas.any((a) => a.toLowerCase() == zoneName.toLowerCase())) {
          _deliveryAreas.add(zoneName);
        }
      });
      final auth = Provider.of<AuthProvider>(context, listen: false);
      auth.updateProfile(deliveryAreas: _deliveryAreas);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ Added "$zoneName" to serviced delivery zones!'),
          backgroundColor: Colors.green[800],
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _addDeliveryZone() {
    final text = _zoneInputCtrl.text.trim();
    if (text.isEmpty) return;

    final parts = text.split(RegExp(r'[,;]+')).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
    setState(() {
      for (final part in parts) {
        if (!_deliveryAreas.any((a) => a.toLowerCase() == part.toLowerCase())) {
          _deliveryAreas.add(part);
        }
      }
      _zoneInputCtrl.clear();
    });
    // Immediately persist to AuthProvider & Firestore
    final auth = Provider.of<AuthProvider>(context, listen: false);
    auth.updateProfile(deliveryAreas: _deliveryAreas);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✅ Added "${parts.join(", ")}" to serviced zones and saved!'),
        backgroundColor: Colors.green[800],
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _removeDeliveryZone(String zone) {
    setState(() {
      _deliveryAreas.remove(zone);
    });
    final auth = Provider.of<AuthProvider>(context, listen: false);
    auth.updateProfile(deliveryAreas: _deliveryAreas);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Removed "$zone" from delivery zones.'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  TimeOfDay _parseTimeOfDay(String timeStr, TimeOfDay fallback) {
    try {
      final clean = timeStr.trim().toUpperCase();
      final isPm = clean.endsWith('PM');
      final isAm = clean.endsWith('AM');
      final timePart = clean.replaceAll(RegExp(r'[A-Z\s]'), '');
      final parts = timePart.split(':');
      if (parts.isNotEmpty) {
        int hour = int.parse(parts[0]);
        int minute = parts.length > 1 ? int.parse(parts[1]) : 0;
        if (isPm && hour < 12) hour += 12;
        if (isAm && hour == 12) hour = 0;
        return TimeOfDay(hour: hour, minute: minute);
      }
    } catch (_) {}
    return fallback;
  }

  String _formatTimeOfDay(TimeOfDay tod) {
    final hour = tod.hourOfPeriod == 0 ? 12 : tod.hourOfPeriod;
    final minute = tod.minute.toString().padLeft(2, '0');
    final period = tod.period == DayPeriod.am ? 'AM' : 'PM';
    final hourStr = hour.toString().padLeft(2, '0');
    return '$hourStr:$minute $period';
  }

  Future<void> _pickOpeningTime() async {
    final current = _parseTimeOfDay(_openingTime, const TimeOfDay(hour: 6, minute: 0));
    final picked = await showTimePicker(
      context: context,
      initialTime: current,
      helpText: 'SELECT PLANT OPENING TIME',
    );
    if (picked != null && mounted) {
      setState(() {
        _openingTime = _formatTimeOfDay(picked);
        _operatingHoursCtrl.text = '$_openingTime - $_closingTime';
      });
      final auth = Provider.of<AuthProvider>(context, listen: false);
      auth.updateProfile(
        openingTime: _openingTime,
        operatingHours: _operatingHoursCtrl.text.trim(),
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🕒 Plant Opening Time updated to $_openingTime'),
          duration: const Duration(seconds: 2),
          backgroundColor: Colors.green[800],
        ),
      );
    }
  }

  Future<void> _pickClosingTime() async {
    final current = _parseTimeOfDay(_closingTime, const TimeOfDay(hour: 21, minute: 0));
    final picked = await showTimePicker(
      context: context,
      initialTime: current,
      helpText: 'SELECT PLANT CLOSING TIME',
    );
    if (picked != null && mounted) {
      setState(() {
        _closingTime = _formatTimeOfDay(picked);
        _operatingHoursCtrl.text = '$_openingTime - $_closingTime';
      });
      final auth = Provider.of<AuthProvider>(context, listen: false);
      auth.updateProfile(
        closingTime: _closingTime,
        operatingHours: _operatingHoursCtrl.text.trim(),
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🕒 Plant Closing Time updated to $_closingTime'),
          duration: const Duration(seconds: 2),
          backgroundColor: Colors.green[800],
        ),
      );
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);

    auth.updateProfile(
      name: _ownerNameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
      address: _addressCtrl.text.trim(),
      city: _cityCtrl.text.trim(),
      profileImage: _plantPhotoUrl,
      deliveryAreas: _deliveryAreas,
      gstNumber: _gstCtrl.text.trim(),
      operatingHours: _operatingHoursCtrl.text.trim(),
      openingTime: _openingTime,
      closingTime: _closingTime,
      isOpenToday: _isOpenToday,
    );

    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Plant & Profile Settings saved successfully!'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }


  Future<void> _pickAndUploadPhoto({required bool fromCamera}) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    final uid = user?.uid ?? 'plant_supplier';

    setState(() => _isUploadingPhoto = true);
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Accessing device photo and uploading to cloud...',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        duration: Duration(seconds: 4),
      ),
    );

    try {
      final pickedFile = fromCamera
          ? await ImageUploadService.pickFromCamera()
          : await ImageUploadService.pickFromGallery();

      if (pickedFile == null) {
        if (mounted) setState(() => _isUploadingPhoto = false);
        return;
      }

      final uploadedUrl = await ImageUploadService.uploadImage(
        pickedFile,
        folder: 'plant_facilities',
        fileIdentifier: uid,
      );

      if (!mounted) return;

      if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
        setState(() {
          _plantPhotoUrl = uploadedUrl;
          _isUploadingPhoto = false;
        });

        // Sync with AuthProvider and Firestore backend
        auth.updateProfile(profileImage: uploadedUrl);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Facility photo updated from your album and synced across devices!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() => _isUploadingPhoto = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not process photo. Please try another image.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Photo upload error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openPlantPhotoSelector(BuildContext context) {
    final curatedPhotos = [
      {
        'title': 'Modern RO Purification Facility',
        'desc': 'High-capacity industrial reverse osmosis plant',
        'url': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Industrial Water Processing Plant',
        'desc': 'Heavy-duty commercial water purification facility',
        'url': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Automated Bottling & Can Unit',
        'desc': 'Sterilized stainless steel can filling line',
        'url': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Eco Pure Spring Water Station',
        'desc': 'Clean and certified drinking water depot',
        'url': 'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=800&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Commercial 20L Can Station',
        'desc': 'Pure drinking water jars purification station',
        'url': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      },
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (_, scrollCtrl) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: ListView(
                controller: scrollCtrl,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const Text(
                    'Update Water Plant Facility Photo',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AquaTheme.textMain),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Choose directly from your device album/gallery or select a verified plant style.',
                    style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                  ),
                  const SizedBox(height: 12),

                  if (kIsWeb)
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFCD34D)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline, color: Color(0xFFB45309), size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Running on Web/PC: Chrome opens your computer file explorer. On mobile phones (Android/iOS), it opens your physical camera.',
                              style: TextStyle(fontSize: 11.5, color: Colors.amber[900], height: 1.3),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Direct Gallery Album Access Option
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      border: Border.all(color: const Color(0xFFBFDBFE), width: 1.5),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AquaTheme.primary,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.photo_library, color: Colors.white, size: 24),
                      ),
                      title: const Text(
                        'Choose from Device Gallery / Album',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AquaTheme.textMain),
                      ),
                      subtitle: const Text(
                        'Direct access to your photo album. Auto-syncs to cloud and all devices.',
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: AquaTheme.primary),
                      onTap: () {
                        Navigator.pop(ctx);
                        _pickAndUploadPhoto(fromCamera: false);
                      },
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Direct Camera Access Option
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      border: Border.all(color: const Color(0xFFBBF7D0), width: 1.5),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.green[700],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.camera_alt, color: Colors.white, size: 24),
                      ),
                      title: const Text(
                        kIsWeb ? 'Camera / File Upload (Web)' : 'Take New Photo with Camera',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AquaTheme.textMain),
                      ),
                      subtitle: const Text(
                        kIsWeb
                            ? 'Opens file selector on Web; on phone hardware this opens the camera.'
                            : 'Capture real-time photo of your water purification plant.',
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                      ),
                      trailing: Icon(Icons.arrow_forward_ios, size: 16, color: Colors.green[700]),
                      onTap: () {
                        Navigator.pop(ctx);
                        _pickAndUploadPhoto(fromCamera: true);
                      },
                    ),
                  ),
                  const SizedBox(height: 20),

                  Row(
                    children: [
                      const Expanded(child: Divider()),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'OR SELECT VERIFIED PLANT PRESET',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey[500], letterSpacing: 0.5),
                        ),
                      ),
                      const Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 16),

                  ...curatedPhotos.map((item) {
                    final isCurrent = _plantPhotoUrl == item['url'];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: isCurrent ? AquaTheme.primary : const Color(0xFFE2E8F0),
                          width: isCurrent ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          setState(() {
                            _plantPhotoUrl = item['url']!;
                          });
                          final auth = Provider.of<AuthProvider>(context, listen: false);
                          auth.updateProfile(profileImage: item['url']);
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('✅ Plant photo updated to: ${item["title"]}'),
                              backgroundColor: Colors.green[800],
                            ),
                          );
                        },
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                              child: Image.network(
                                item['url']!,
                                height: 130,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (ctx, _, __) => Container(
                                  height: 130,
                                  width: double.infinity,
                                  color: const Color(0xFFE2E8F0),
                                  child: const Icon(Icons.water_drop, color: AquaTheme.primary, size: 36),
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['title']!,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          item['desc']!,
                                          style: const TextStyle(fontSize: 11, color: AquaTheme.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isCurrent)
                                    const Icon(Icons.check_circle, color: AquaTheme.primary, size: 22),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Plant & Profile Settings'),
      ),
      body: ResponsiveLayout(
        maxWidth: 820,
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Header Card
              Card(
                color: AquaTheme.primary,
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        radius: 30,
                        backgroundColor: Colors.white24,
                        child: Icon(Icons.factory_outlined, size: 36, color: Colors.white),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.name.isNotEmpty == true ? user!.name : 'Water Supplier Plant',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              user?.email ?? '',
                              style: const TextStyle(fontSize: 13, color: Colors.white70),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white24,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('Verified Supplier Account', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Water Plant Facility Photo Card (Visible to Customers)
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE0F2FE),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.photo_camera, color: AquaTheme.primary, size: 22),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Water Plant Facility Photo',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AquaTheme.textMain),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Customers see this photo when browsing popular water plants.',
                                  style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Stack(
                          children: [
                            ImageUploadService.buildImageWidget(
                              _plantPhotoUrl ?? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
                              height: 180,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              placeholder: Container(
                                height: 180,
                                color: const Color(0xFFE0F2FE),
                                child: const Center(
                                  child: Icon(Icons.factory, size: 54, color: AquaTheme.primary),
                                ),
                              ),
                            ),
                            if (_isUploadingPhoto)
                              Container(
                                height: 180,
                                width: double.infinity,
                                color: Colors.black45,
                                child: const Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      CircularProgressIndicator(color: Colors.white),
                                      SizedBox(height: 10),
                                      Text(
                                        'Uploading photo to cloud...',
                                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            Positioned(
                              top: 10,
                              left: 10,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.7),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.verified, color: Colors.greenAccent, size: 14),
                                    SizedBox(width: 4),
                                    Text('Customer View', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _isUploadingPhoto ? null : () => _pickAndUploadPhoto(fromCamera: false),
                              icon: const Icon(Icons.photo_library, size: 18),
                              label: const Text('From Gallery', overflow: TextOverflow.ellipsis),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AquaTheme.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _isUploadingPhoto ? null : () => _pickAndUploadPhoto(fromCamera: true),
                              icon: const Icon(Icons.camera_alt, size: 18),
                              label: const Text('Take Photo', overflow: TextOverflow.ellipsis),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AquaTheme.primary,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: TextButton.icon(
                          onPressed: () => _openPlantPhotoSelector(context),
                          icon: const Icon(Icons.grid_view_rounded, size: 15),
                          label: const Text('Or select verified plant preset', style: TextStyle(fontSize: 12)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Basic Business Details Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.business, color: AquaTheme.primary, size: 20),
                          SizedBox(width: 8),
                          Text('Plant & Business Information', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const Divider(height: 20),
                      TextFormField(
                        controller: _ownerNameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Plant / Owner Name *',
                          prefixIcon: Icon(Icons.person_outline),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter owner name' : null,
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Contact Phone Number *',
                          prefixIcon: Icon(Icons.phone_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter phone number' : null,
                      ),
                      const SizedBox(height: 14),

                      // Plant Location Header with Auto-Detect GPS & Pick on Map
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          const Text(
                            'PLANT FACILITY ADDRESS',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                          ),
                          Wrap(
                            spacing: 4,
                            children: [
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  visualDensity: VisualDensity.compact,
                                ),
                                icon: _isDetectingPlantGps
                                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                                    : const Icon(Icons.my_location, size: 14, color: Colors.green),
                                label: const Text('GPS Detect', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
                                onPressed: _isDetectingPlantGps ? null : _detectPlantGps,
                              ),
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  visualDensity: VisualDensity.compact,
                                ),
                                icon: const Icon(Icons.map_outlined, size: 14, color: AquaTheme.primary),
                                label: const Text('Pick on Map', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.primary)),
                                onPressed: _pickPlantOnMap,
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      TextFormField(
                        controller: _addressCtrl,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Plant Address / Fulfillment Facility *',
                          prefixIcon: Icon(Icons.location_on_outlined),
                          hintText: 'Enter your plant/warehouse street, locality, landmark',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter plant facility address' : null,
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _cityCtrl,
                              decoration: const InputDecoration(
                                labelText: 'City / Region *',
                                prefixIcon: Icon(Icons.location_city_outlined),
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) => v == null || v.trim().isEmpty ? 'Please enter city' : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _gstCtrl,
                              decoration: const InputDecoration(
                                labelText: 'GSTIN (Optional)',
                                prefixIcon: Icon(Icons.receipt_outlined),
                                hintText: 'Enter GST number',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              // Plant Operating Hours & Timings Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Expanded(
                            child: Row(
                              children: [
                                Icon(Icons.schedule, color: AquaTheme.primary, size: 20),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Plant Operating Hours & Timings',
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _isOpenToday ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: _isOpenToday ? const Color(0xFF86EFAC) : const Color(0xFFFCA5A5)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _isOpenToday ? Icons.check_circle : Icons.pause_circle_filled,
                                  size: 13,
                                  color: _isOpenToday ? const Color(0xFF16A34A) : Colors.red,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _isOpenToday ? 'Open Today' : 'Closed Today',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: _isOpenToday ? const Color(0xFF166534) : Colors.red.shade900,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Set when your plant opens and stops accepting customer water orders each day. Customers will see these timings in the store and checkout.',
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                      ),
                      const Divider(height: 20),

                      // Plant Open/Closed Switch
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _isOpenToday ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _isOpenToday ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA)),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _isOpenToday ? Icons.store : Icons.store_mall_directory_outlined,
                              color: _isOpenToday ? const Color(0xFF16A34A) : Colors.red,
                              size: 22,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _isOpenToday ? 'Plant is Active & Accepting Orders' : 'Plant is Temporarily Closed Today',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: _isOpenToday ? const Color(0xFF166534) : Colors.red.shade900,
                                    ),
                                  ),
                                  Text(
                                    _isOpenToday
                                        ? 'Customers can place water orders during your open hours'
                                        : 'Orders paused. Customers will be informed that plant is closed',
                                    style: TextStyle(fontSize: 11, color: _isOpenToday ? const Color(0xFF15803D) : Colors.red.shade700),
                                  ),
                                ],
                              ),
                            ),
                            Switch.adaptive(
                              value: _isOpenToday,
                              activeTrackColor: const Color(0xFF16A34A),
                              onChanged: (val) {
                                setState(() => _isOpenToday = val);
                                final auth = Provider.of<AuthProvider>(context, listen: false);
                                auth.updateProfile(isOpenToday: _isOpenToday);
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Opening & Closing Time Pickers
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: _pickOpeningTime,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.blue.shade200, width: 1.5),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.wb_sunny_outlined, size: 16, color: Colors.amber),
                                        SizedBox(width: 6),
                                        Text('Opening Time', style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Text(_openingTime, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AquaTheme.primary)),
                                        const Spacer(),
                                        const Icon(Icons.edit, size: 14, color: AquaTheme.primary),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: InkWell(
                              onTap: _pickClosingTime,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.purple.shade200, width: 1.5),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.nightlight_round, size: 16, color: Colors.purple),
                                        SizedBox(width: 6),
                                        Text('Closing Time', style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Text(_closingTime, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.purple)),
                                        const Spacer(),
                                        const Icon(Icons.edit, size: 14, color: Colors.purple),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Operating Hours text field
                      TextFormField(
                        controller: _operatingHoursCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Display Timings (Customer facing)',
                          prefixIcon: Icon(Icons.timelapse_outlined),
                          hintText: 'e.g. 6:00 AM - 9:00 PM (Mon - Sun)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Serviced Delivery Zones Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.map_outlined, color: AquaTheme.primary, size: 20),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Serviced Villages & Delivery Locations',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Configure the villages, colonies, towns, and PIN codes your water delivery fleet covers. Customer orders from these locations will be automatically routed to you.',
                        style: TextStyle(fontSize: 12, color: AquaTheme.textSecondary),
                      ),
                      const SizedBox(height: 12),

                      // Plant Base Facility / Village Display Banner
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF86EFAC)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const CircleAvatar(
                              radius: 18,
                              backgroundColor: Color(0xFF16A34A),
                              child: Icon(Icons.storefront, color: Colors.white, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Expanded(
                                        child: Text(
                                          'Plant Base Location / Village',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF166534)),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(Icons.verified, size: 14, color: Color(0xFF16A34A)),
                                      const SizedBox(width: 6),
                                      InkWell(
                                        onTap: _pickPlantOnMap,
                                        child: const Padding(
                                          padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                          child: Text(
                                            'Edit Base',
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF16A34A), decoration: TextDecoration.underline),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _addressCtrl.text.trim().isNotEmpty
                                        ? _addressCtrl.text.trim()
                                        : 'Not set yet (Update address above or pick on map)',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: _addressCtrl.text.trim().isNotEmpty ? Colors.black87 : Colors.orange.shade800,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (_cityCtrl.text.trim().isNotEmpty) ...[
                                    const SizedBox(height: 1),
                                    Text(
                                      'Region: ${_cityCtrl.text.trim()}',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF15803D)),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Location Buttons: Auto-Detect GPS Locality + Pick on Map
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: _isDetectingZoneGps
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.my_location, size: 16),
                              label: const Text('+ Add Current GPS Locality', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              onPressed: _isDetectingZoneGps ? null : _addZoneFromGps,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AquaTheme.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: const Icon(Icons.pin_drop_outlined, size: 16),
                              label: const Text('+ Pick Zone on Map', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              onPressed: _addZoneFromMap,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Proximity routing notification banner
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.bolt, color: Colors.blue, size: 18),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Nearby Customer Matching: When customers in these zones or near your facility place water orders, they will be matched to your plant and appear in your Orders POS and Fleet tabs.',
                                style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 24),

                      // Manual Add Zone Input
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _zoneInputCtrl,
                              decoration: const InputDecoration(
                                hintText: 'Type area / colony (e.g. Vaddagandla, NH40, Allagadda, Madhapur)',
                                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(),
                              ),
                              onSubmitted: (_) => _addDeliveryZone(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AquaTheme.primary,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.add, size: 18, color: Colors.white),
                            label: const Text('Add Area', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            onPressed: _addDeliveryZone,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Configured Zones List
                      if (_deliveryAreas.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.location_off_outlined, color: AquaTheme.textSecondary, size: 32),
                              SizedBox(height: 6),
                              Text(
                                'No delivery zones added yet',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Use the GPS or Map buttons above, or type your areas to specify where you deliver.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 11, color: AquaTheme.textSecondary),
                              ),
                            ],
                          ),
                        )
                      else ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${_deliveryAreas.length} Active Covered Delivery Zone${_deliveryAreas.length > 1 ? "s" : ""}:',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AquaTheme.textSecondary),
                            ),
                            TextButton.icon(
                              icon: const Icon(Icons.clear_all, size: 16, color: Colors.red),
                              label: const Text('Clear All', style: TextStyle(fontSize: 11, color: Colors.red)),
                              onPressed: () => setState(() => _deliveryAreas.clear()),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _deliveryAreas.map((zone) {
                            return Chip(
                              backgroundColor: const Color(0xFFE0F2FE),
                              label: Text(
                                '📍 $zone',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AquaTheme.primary, fontSize: 13),
                              ),
                              deleteIcon: const Icon(Icons.cancel, size: 16, color: AquaTheme.primary),
                              onDeleted: () => _removeDeliveryZone(zone),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Save Action Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                  ),
                  icon: _isSaving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.save, color: Colors.white),
                  label: Text(
                    _isSaving ? 'Saving Changes...' : 'Save Plant & Delivery Settings',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  onPressed: _isSaving ? null : _saveProfile,
                ),
              ),
              const SizedBox(height: 16),

              // Emergency App Support Helpline Card (8522828688)
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
                            Text(
                              'Emergency App Support',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF166534)),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Helpline: 8522828688 (24x7 Assistance)',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF15803D)),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Technical support & immediate fleet escalation for plants',
                              style: TextStyle(fontSize: 11, color: Color(0xFF166534)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}
