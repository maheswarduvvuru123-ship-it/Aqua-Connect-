import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../utils/theme.dart';

class LocationResult {
  final String formattedAddress;
  final String locality;
  final String city;
  final String pincode;
  final double lat;
  final double lng;

  const LocationResult({
    required this.formattedAddress,
    required this.locality,
    required this.city,
    required this.pincode,
    required this.lat,
    required this.lng,
  });
}

class LocalityPreset {
  final String name;
  final String city;
  final String pincode;
  final double lat;
  final double lng;

  const LocalityPreset({
    required this.name,
    required this.city,
    required this.pincode,
    required this.lat,
    required this.lng,
  });
}

const List<LocalityPreset> popularLocalities = [
  LocalityPreset(name: 'Madhapur', city: 'Hyderabad', pincode: '500081', lat: 17.4483, lng: 78.3915),
  LocalityPreset(name: 'Hitec City', city: 'Hyderabad', pincode: '500081', lat: 17.4435, lng: 78.3772),
  LocalityPreset(name: 'Gachibowli', city: 'Hyderabad', pincode: '500032', lat: 17.4401, lng: 78.3489),
  LocalityPreset(name: 'Kondapur', city: 'Hyderabad', pincode: '500084', lat: 17.4699, lng: 78.3578),
  LocalityPreset(name: 'Jubilee Hills', city: 'Hyderabad', pincode: '500033', lat: 17.4319, lng: 78.4073),
  LocalityPreset(name: 'Banjara Hills', city: 'Hyderabad', pincode: '500034', lat: 17.4156, lng: 78.4354),
  LocalityPreset(name: 'Kukatpally', city: 'Hyderabad', pincode: '500072', lat: 17.4875, lng: 78.4039),
  LocalityPreset(name: 'Manikonda', city: 'Hyderabad', pincode: '500089', lat: 17.3995, lng: 78.3888),
  LocalityPreset(name: 'Financial District', city: 'Hyderabad', pincode: '500075', lat: 17.4168, lng: 78.3428),
  LocalityPreset(name: 'Begumpet', city: 'Hyderabad', pincode: '500016', lat: 17.4448, lng: 78.4665),
];

/// Checks permissions and gets the exact device GPS / browser location (NOT IP-based)
Future<Position?> getExactDevicePosition() async {
  try {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('Device location service is disabled');
      return null;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        debugPrint('Location permission denied by user');
        return null;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      debugPrint('Location permission permanently denied');
      return null;
    }

    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
          timeLimit: Duration(seconds: 12),
        ),
      );
    } catch (e) {
      debugPrint('Error in getCurrentPosition: $e');
      try {
        return await Geolocator.getLastKnownPosition();
      } catch (_) {
        return null;
      }
    }
  } catch (e) {
    debugPrint('Safely caught location service error on device: $e');
    return null;
  }
}

/// Reverse-geocodes exact coordinates into a clean Indian street address
Future<LocationResult?> reverseGeocodeCoordinates(double lat, double lng) async {
  // 1. Nominatim OpenStreetMap (High detail)
  try {
    final nomRes = await http.get(
      Uri.parse('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=$lat&lon=$lng'),
      headers: {
        'User-Agent': 'AquaConnect-WaterDelivery/2.0 (contact: support@aquaconnect.app)',
        'Accept-Language': 'en',
      },
    ).timeout(const Duration(seconds: 6));

    if (nomRes.statusCode == 200) {
      final nomData = jsonDecode(nomRes.body);
      final addr = nomData['address'] as Map<String, dynamic>? ?? {};
      final houseNumber = addr['house_number'] ?? '';
      final building = addr['building'] ?? '';
      final road = addr['road'] ?? addr['pedestrian'] ?? addr['street'] ?? '';
      final suburb = addr['suburb'] ?? addr['neighbourhood'] ?? addr['residential'] ?? addr['subdistrict'] ?? '';
      final city = addr['city'] ?? addr['town'] ?? addr['village'] ?? addr['county'] ?? addr['state_district'] ?? '';
      final state = addr['state'] ?? '';
      final postcode = addr['postcode'] ?? '';

      final premise = [houseNumber, building].where((s) => s.toString().isNotEmpty).join(' ');
      final addressParts = [
        premise,
        road,
        suburb,
        city,
        if (state.toString().isNotEmpty) state,
        if (postcode.toString().isNotEmpty) postcode,
      ].where((s) => s.toString().trim().isNotEmpty).toList();

      String formatted = addressParts.join(', ');
      if (formatted.isEmpty) {
        formatted = nomData['display_name']?.toString() ?? 'GPS: ${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
      }

      String locality = suburb.toString();
      if (locality.isEmpty) locality = road.toString();
      if (locality.isEmpty) locality = city.toString();
      if (locality.isEmpty) locality = 'Current Location';

      return LocationResult(
        formattedAddress: formatted,
        locality: locality,
        city: city.toString().isNotEmpty ? city.toString() : 'Local Area',
        pincode: postcode.toString(),
        lat: lat,
        lng: lng,
      );
    }
  } catch (e) {
    debugPrint('Nominatim reverse geocode error: $e');
  }

  // 2. Secondary fallback geocoder: BigDataCloud client API
  try {
    final bdcRes = await http.get(
      Uri.parse('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=$lat&longitude=$lng&localityLanguage=en'),
    ).timeout(const Duration(seconds: 5));

    if (bdcRes.statusCode == 200) {
      final bdcData = jsonDecode(bdcRes.body);
      final locality = bdcData['locality'] ?? bdcData['principalSubdivision'] ?? '';
      final city = bdcData['city'] ?? bdcData['locality'] ?? '';
      final postcode = bdcData['postcode'] ?? '';
      final state = bdcData['principalSubdivision'] ?? '';

      final parts = [locality, city, state, postcode].where((s) => s.toString().trim().isNotEmpty).toList();
      return LocationResult(
        formattedAddress: parts.join(', '),
        locality: locality.toString(),
        city: city.toString(),
        pincode: postcode.toString(),
        lat: lat,
        lng: lng,
      );
    }
  } catch (e) {
    debugPrint('BigDataCloud reverse geocode error: $e');
  }

  return LocationResult(
    formattedAddress: 'GPS: ${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
    locality: 'GPS Location',
    city: 'Local Area',
    pincode: '',
    lat: lat,
    lng: lng,
  );
}

/// Auto-detects device GPS location (Never uses inaccurate IP address)
Future<LocationResult?> autoDetectDeviceLocation() async {
  final pos = await getExactDevicePosition();
  if (pos == null) {
    return null; // Return null so app can show clear prompt/open map picker
  }
  return await reverseGeocodeCoordinates(pos.latitude, pos.longitude);
}

class ZomatoLocationPickerDialog extends StatefulWidget {
  final String role; // 'supplier' or 'customer'
  final String? initialAddress;

  const ZomatoLocationPickerDialog({
    super.key,
    required this.role,
    this.initialAddress,
  });

  @override
  State<ZomatoLocationPickerDialog> createState() => _ZomatoLocationPickerDialogState();
}

class _ZomatoLocationPickerDialogState extends State<ZomatoLocationPickerDialog> {
  LocalityPreset _selectedLocality = popularLocalities.first;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _doorController = TextEditingController();
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  bool _isDetecting = false;
  String _currentFormatted = 'Madhapur Main Rd, Hitec City Zone, Hyderabad, 500081';
  Offset _pinOffset = Offset.zero;

  @override
  void initState() {
    super.initState();
    if (widget.initialAddress != null && widget.initialAddress!.trim().isNotEmpty) {
      final initial = widget.initialAddress!.trim();
      _currentFormatted = initial;
      _searchController.text = initial;
      final parts = initial.split(',');
      final locName = parts.first.trim();
      final cityName = parts.length > 1 ? parts[1].trim() : 'Local Area';
      _selectedLocality = LocalityPreset(
        name: locName.isNotEmpty ? locName : 'Selected Area',
        city: cityName,
        pincode: '',
        lat: 17.4483,
        lng: 78.3915,
      );
    }
  }

  void _selectTypedLocation(String typed) {
    final clean = typed.trim();
    if (clean.isEmpty) return;
    final parts = clean.split(',');
    final locName = parts.first.trim();
    final cityName = parts.length > 1 ? parts[1].trim() : 'Local Area';

    setState(() {
      _currentFormatted = clean;
      _pinOffset = Offset.zero;
      _selectedLocality = LocalityPreset(
        name: locName.isNotEmpty ? locName : clean,
        city: cityName,
        pincode: '',
        lat: 17.4483,
        lng: 78.3915,
      );
      _searchResults = [];
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _doorController.dispose();
    super.dispose();
  }

  Future<void> _handleGpsDetect() async {
    setState(() => _isDetecting = true);
    final res = await autoDetectDeviceLocation();
    setState(() => _isDetecting = false);

    if (!mounted) return;

    if (res != null) {
      setState(() {
        _currentFormatted = res.formattedAddress;
        _pinOffset = Offset.zero;
        _selectedLocality = LocalityPreset(
          name: res.locality,
          city: res.city,
          pincode: res.pincode,
          lat: res.lat,
          lng: res.lng,
        );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Exact GPS location detected: ${res.locality}, ${res.city}'),
          backgroundColor: Colors.green[800],
          duration: const Duration(seconds: 3),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ GPS permission not granted or location service off. Please search your area or tap on the map below.'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 4),
        ),
      );
    }
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().length < 2) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _isSearching = true);
    try {
      // Universal Indian search with address details, no hardcoded city restrictions
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/search?format=jsonv2&q=${Uri.encodeComponent(query.trim())}&countrycodes=in&addressdetails=1&limit=6',
      );
      final res = await http.get(url, headers: {
        'User-Agent': 'AquaConnect-WaterDelivery/2.0 (contact: support@aquaconnect.app)',
        'Accept-Language': 'en',
      }).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        setState(() {
          _searchResults = list.map((item) => item as Map<String, dynamic>).toList();
        });
      }
    } catch (e) {
      debugPrint('Search error: $e');
    }
    if (mounted) {
      setState(() => _isSearching = false);
    }
  }

  void _onConfirm() {
    String finalAddr = _currentFormatted;
    String locName = _selectedLocality.name;
    String cityName = _selectedLocality.city;

    // Prioritize typed search box text over default Madhapur fallback
    final typed = _searchController.text.trim();
    if (typed.isNotEmpty) {
      if (_selectedLocality.name.toLowerCase() == 'madhapur' ||
          _currentFormatted.toLowerCase().contains('madhapur') ||
          !_currentFormatted.toLowerCase().contains(typed.toLowerCase())) {
        finalAddr = typed;
        locName = typed.split(',').first.trim();
        cityName = typed.split(',').length > 1 ? typed.split(',')[1].trim() : (resCityOrDefault(typed));
      }
    }

    if (_doorController.text.trim().isNotEmpty) {
      finalAddr = '${_doorController.text.trim()}, $finalAddr';
    }

    Navigator.of(context).pop(LocationResult(
      formattedAddress: finalAddr,
      locality: locName,
      city: cityName,
      pincode: _selectedLocality.pincode,
      lat: _selectedLocality.lat,
      lng: _selectedLocality.lng,
    ));
  }

  String resCityOrDefault(String typed) {
    if (widget.initialAddress != null && widget.initialAddress!.isNotEmpty) {
      return widget.initialAddress!;
    }
    return 'Local Area';
  }

  @override
  Widget build(BuildContext context) {
    final isSupplier = widget.role == 'supplier';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 580, maxHeight: 740),
        child: Column(
          children: [
            // Top Zomato Gradient Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AquaTheme.primary, AquaTheme.secondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.location_on, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isSupplier ? 'Set Water Plant / Supply Hub' : 'Set Exact Water Delivery Location',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                        ),
                        Text(
                          isSupplier
                              ? 'Interactive map & high-precision GPS for fulfillment plant'
                              : 'Pinpoint your exact delivery address for fast doorstep delivery',
                          style: const TextStyle(fontSize: 11, color: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Scrollable Content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Zomato "Use Current Location" (GPS) Card
                  InkWell(
                    onTap: _isDetecting ? null : _handleGpsDetect,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF86EFAC), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.green.withValues(alpha: 0.08),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: const Color(0xFF22C55E),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.green.withValues(alpha: 0.25),
                                  blurRadius: 6,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                            child: _isDetecting
                                ? const Center(
                                    child: SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                    ),
                                  )
                                : const Icon(Icons.my_location, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _isDetecting ? 'Detecting satellite GPS coordinates...' : 'Use Current Location (Device GPS)',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF166534)),
                                ),
                                const Text(
                                  'Uses device GPS satellite hardware for exact street-level accuracy',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF15803D)),
                                ),
                              ],
                            ),
                          ),
                          const Text(
                            'Auto-Detect →',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF16A34A)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Search Bar with clear icon
                  TextField(
                    controller: _searchController,
                    onChanged: (val) => _performSearch(val),
                    decoration: InputDecoration(
                      hintText: 'Search any colony, street, apartment, landmark...',
                      prefixIcon: const Icon(Icons.search, color: AquaTheme.primary),
                      suffixIcon: _isSearching
                          ? const Padding(
                              padding: EdgeInsets.all(12.0),
                              child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchResults = []);
                                  },
                                )
                              : null,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),

                  // Quick button to confirm typed location/village directly
                  if (_searchController.text.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () => _selectTypedLocation(_searchController.text.trim()),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF93C5FD)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.add_location_alt, color: AquaTheme.primary, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Use Typed Location: "${_searchController.text.trim()}"',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AquaTheme.primary),
                                  ),
                                  const Text(
                                    'Tap to select this exact village, colony or area',
                                    style: TextStyle(fontSize: 11, color: AquaTheme.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.check_circle, color: AquaTheme.primary, size: 18),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // Live Search Suggestions Dropdown
                  if (_searchResults.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 3))],
                      ),
                      child: Column(
                        children: _searchResults.map((item) {
                          final displayName = item['display_name']?.toString() ?? '';
                          final addr = item['address'] as Map<String, dynamic>? ?? {};
                          final city = (addr['city'] ?? addr['town'] ?? addr['county'] ?? addr['state_district'] ?? 'Local Area').toString();
                          final postcode = (addr['postcode'] ?? '').toString();
                          final road = (addr['road'] ?? addr['suburb'] ?? '').toString();
                          final parts = displayName.split(',');
                          final name = parts.isNotEmpty ? parts.first.trim() : displayName;

                          return ListTile(
                            dense: true,
                            leading: const Icon(Icons.location_on, color: Colors.redAccent, size: 20),
                            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            subtitle: Text(displayName, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                            onTap: () {
                              final lat = double.tryParse(item['lat']?.toString() ?? '') ?? 17.4483;
                              final lon = double.tryParse(item['lon']?.toString() ?? '') ?? 78.3915;
                              setState(() {
                                _currentFormatted = displayName.split(',').take(4).join(', ');
                                _pinOffset = Offset.zero;
                                _selectedLocality = LocalityPreset(
                                  name: name.isNotEmpty ? name : (road.isNotEmpty ? road : 'Selected Area'),
                                  city: city,
                                  pincode: postcode,
                                  lat: lat,
                                  lng: lon,
                                );
                                _searchResults = [];
                                _searchController.clear();
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),

                  // Interactive Map Visual Container (Tap anywhere to adjust pin!)
                  GestureDetector(
                    onTapUp: (details) async {
                      // Adjust pin coordinates slightly on tap
                      final box = context.findRenderObject() as RenderBox?;
                      final width = box?.size.width ?? 300.0;
                      final dx = (details.localPosition.dx - (width / 2)) / (width / 2);
                      final dy = (details.localPosition.dy - 90.0) / 90.0;
                      final newLat = _selectedLocality.lat - (dy * 0.003);
                      final newLng = _selectedLocality.lng + (dx * 0.003);

                      setState(() {
                        _pinOffset = Offset(details.localPosition.dx - 150, details.localPosition.dy - 90);
                        _selectedLocality = LocalityPreset(
                          name: _selectedLocality.name,
                          city: _selectedLocality.city,
                          pincode: _selectedLocality.pincode,
                          lat: newLat,
                          lng: newLng,
                        );
                      });

                      final rev = await reverseGeocodeCoordinates(newLat, newLng);
                      if (rev != null && mounted) {
                        setState(() {
                          _currentFormatted = rev.formattedAddress;
                          _selectedLocality = LocalityPreset(
                            name: rev.locality,
                            city: rev.city,
                            pincode: rev.pincode,
                            lat: newLat,
                            lng: newLng,
                          );
                        });
                      }
                    },
                    child: Container(
                      height: 190,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.blueGrey.shade200, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Stack(
                        children: [
                          // Map Grid Background Pattern
                          Positioned.fill(
                            child: CustomPaint(
                              painter: _MapGridPainter(),
                            ),
                          ),

                          // Center Map Pin (Signature Zomato Bouncing Pin)
                          Center(
                            child: Transform.translate(
                              offset: _pinOffset,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(20),
                                      boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 2))],
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Text('● ', style: TextStyle(color: Colors.green, fontSize: 10)),
                                        Text(
                                          isSupplier ? 'PLANT LOCATION' : 'DELIVER HERE',
                                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(
                                    Icons.location_pin,
                                    size: 48,
                                    color: Colors.redAccent,
                                  ),
                                  Container(
                                    width: 14,
                                    height: 5,
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.3),
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Tap to adjust hint
                          Positioned(
                            top: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.9),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.touch_app, size: 12, color: Colors.black87),
                                  SizedBox(width: 4),
                                  Text(
                                    'Tap anywhere on map to reposition pin',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.black87),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // GPS Coordinates Tag
                          Positioned(
                            bottom: 8,
                            right: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.9),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'GPS: ${_selectedLocality.lat.toStringAsFixed(4)}, ${_selectedLocality.lng.toStringAsFixed(4)}',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black87),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),



                  // Selected Address Details Card & Flat/Door input
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('CONFIRMED LOCALITY & AREA:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary)),
                            Text('✓ Locality Verified', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '📍 $_currentFormatted',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AquaTheme.textMain),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _doorController,
                          decoration: InputDecoration(
                            hintText: 'Flat / Door / Building No., Apartment, Landmark (Optional)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            isDense: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Bottom Confirmation Action Bar
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _onConfirm,
                      icon: const Icon(Icons.check, color: Colors.white),
                      label: const Text('Confirm Location', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFE2E8F0);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final roadPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 14
      ..style = PaintingStyle.stroke;

    final minorRoadPaint = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 6
      ..style = PaintingStyle.stroke;

    // Draw stylized roads & intersections
    canvas.drawLine(Offset(0, size.height * 0.5), Offset(size.width, size.height * 0.5), roadPaint);
    canvas.drawLine(Offset(size.width * 0.4, 0), Offset(size.width * 0.4, size.height), roadPaint);
    canvas.drawLine(Offset(0, size.height * 0.25), Offset(size.width, size.height * 0.25), minorRoadPaint);
    canvas.drawLine(Offset(0, size.height * 0.75), Offset(size.width, size.height * 0.75), minorRoadPaint);
    canvas.drawLine(Offset(size.width * 0.75, 0), Offset(size.width * 0.75, size.height), minorRoadPaint);

    // Green zone / park indicator
    final parkPaint = Paint()..color = const Color(0xFFD1FAE5);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(10, 10, size.width * 0.3, size.height * 0.35),
        const Radius.circular(8),
      ),
      parkPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
