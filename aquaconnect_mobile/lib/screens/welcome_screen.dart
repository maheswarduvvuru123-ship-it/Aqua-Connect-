import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/water_delivery_provider.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';
import '../widgets/zomato_location_picker_dialog.dart';
import '../widgets/aquaconnect_logo.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();

  String _selectedRole = 'supplier';
  bool _isLoginTab = true;
  bool _obscurePassword = true;
  bool _isDetectingLocation = false;

  Future<void> _handleGpsAutoDetect() async {
    setState(() => _isDetectingLocation = true);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  '🛰️ Acquiring high-precision device GPS...',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          duration: Duration(seconds: 4),
        ),
      );
    }

    final res = await autoDetectDeviceLocation();
    setState(() => _isDetectingLocation = false);

    if (!mounted) return;

    if (res != null) {
      setState(() {
        _addressController.text = res.formattedAddress;
      });
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Exact location detected: ${res.formattedAddress}'),
          backgroundColor: Colors.green[800],
          duration: const Duration(seconds: 4),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ GPS permission not granted or location service off. Opening map picker...'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
      await _openZomatoMapPicker();
    }
  }

  Future<void> _openZomatoMapPicker() async {
    final result = await showDialog<LocationResult>(
      context: context,
      builder: (ctx) => ZomatoLocationPickerDialog(
        role: _selectedRole,
        initialAddress: _addressController.text,
      ),
    );

    if (result != null) {
      setState(() {
        _addressController.text = result.formattedAddress;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('📍 Location selected: ${result.locality}, ${result.city}'),
            backgroundColor: Colors.green[800],
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email')),
      );
      return;
    }
    if (password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your password')),
      );
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final error = await auth.login(
      email: email,
      password: password,
      role: _selectedRole,
    );

    if (!mounted) return;

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  error,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          backgroundColor: Colors.red[800],
          duration: const Duration(seconds: 4),
        ),
      );
      return;
    }

    // Success! If customer, sync profile to water provider
    if (_selectedRole == 'customer' && auth.currentUser != null) {
      final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
      waterData.registerOrUpdateCustomer(
        id: auth.currentUser!.uid,
        name: auth.currentUser!.name,
        phone: auth.currentUser!.phone,
        address: auth.currentUser!.address ?? '',
        email: auth.currentUser!.email,
      );
    }
  }

  void _handleRegister() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final phone = _phoneController.text.trim();
    final address = _addressController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your full name')),
      );
      return;
    }
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email')),
      );
      return;
    }
    if (password.isEmpty || password.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 6 characters')),
      );
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final error = await auth.register(
      name: name,
      email: email,
      password: password,
      role: _selectedRole,
      phone: phone,
      address: address,
    );

    if (!mounted) return;

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: Colors.red[800],
          duration: const Duration(seconds: 4),
        ),
      );
      return;
    }

    // Also sync customer into waterData
    if (_selectedRole == 'customer' && auth.currentUser != null) {
      final waterData = Provider.of<WaterDeliveryProvider>(context, listen: false);
      waterData.registerOrUpdateCustomer(
        id: auth.currentUser!.uid,
        name: auth.currentUser!.name,
        phone: auth.currentUser!.phone,
        address: auth.currentUser!.address ?? '',
        email: auth.currentUser!.email,
      );
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Account created successfully as ${_selectedRole.toUpperCase()}! Stored in Firebase backend.'),
        backgroundColor: Colors.green[800],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      body: SafeArea(
        child: ResponsiveLayout(
          maxWidth: 520,
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Brand Logo & Header
                  const Center(
                    child: AquaConnectLogo(
                      size: 80,
                      withShadow: true,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'AquaConnect',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AquaTheme.textMain,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Smart Water Delivery & POS System',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AquaTheme.primary,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Role Selector Tabs (Supplier vs Customer)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedRole = 'supplier';
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: _selectedRole == 'supplier' ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: _selectedRole == 'supplier'
                                    ? [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.05),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        )
                                      ]
                                    : null,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.local_shipping,
                                    size: 18,
                                    color: _selectedRole == 'supplier' ? AquaTheme.primary : AquaTheme.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Water Supplier',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: _selectedRole == 'supplier' ? AquaTheme.primary : AquaTheme.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedRole = 'customer';
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: _selectedRole == 'customer' ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: _selectedRole == 'customer'
                                    ? [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.05),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        )
                                      ]
                                    : null,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.person,
                                    size: 18,
                                    color: _selectedRole == 'customer' ? AquaTheme.primary : AquaTheme.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Customer',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: _selectedRole == 'customer' ? AquaTheme.primary : AquaTheme.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Role Explanation Banner
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: _selectedRole == 'supplier' ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _selectedRole == 'supplier' ? const Color(0xFFBFDBFE) : const Color(0xFFBBF7D0),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _selectedRole == 'supplier' ? Icons.storefront : Icons.person_pin,
                          color: _selectedRole == 'supplier' ? const Color(0xFF1D4ED8) : const Color(0xFF15803D),
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _selectedRole == 'supplier' ? 'Account Type: Water Supplier / Plant' : 'Account Type: Customer / Consumer',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: _selectedRole == 'supplier' ? const Color(0xFF1E40AF) : const Color(0xFF166534),
                                ),
                              ),
                              Text(
                                _selectedRole == 'supplier'
                                    ? 'Plant operations, POS billing, fleet dispatch & jar tracking'
                                    : 'Order 20L/10L cans, track deliveries, subscriptions & bottle return',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: _selectedRole == 'supplier' ? const Color(0xFF3B82F6) : const Color(0xFF16A34A),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Toggle Sign In / Register
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => setState(() => _isLoginTab = true),
                          style: TextButton.styleFrom(
                            foregroundColor: _isLoginTab ? AquaTheme.primary : AquaTheme.textSecondary,
                          ),
                          child: Column(
                            children: [
                              Text('Sign In', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: _isLoginTab ? AquaTheme.primary : AquaTheme.textSecondary)),
                              const SizedBox(height: 4),
                              Container(height: 2, color: _isLoginTab ? AquaTheme.primary : Colors.transparent),
                            ],
                          ),
                        ),
                      ),
                      Expanded(
                        child: TextButton(
                          onPressed: () => setState(() => _isLoginTab = false),
                          style: TextButton.styleFrom(
                            foregroundColor: !_isLoginTab ? AquaTheme.primary : AquaTheme.textSecondary,
                          ),
                          child: Column(
                            children: [
                              Text('Create Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: !_isLoginTab ? AquaTheme.primary : AquaTheme.textSecondary)),
                              const SizedBox(height: 4),
                              Container(height: 2, color: !_isLoginTab ? AquaTheme.primary : Colors.transparent),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Form Fields
                  if (_isLoginTab) ...[
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: 'Email Address or Phone',
                        hintText: 'Enter your registered email',
                        prefixIcon: const Icon(Icons.email_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: auth.isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AquaTheme.primary,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: auth.isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : Text(
                              'Sign In as ${_selectedRole == "supplier" ? "Supplier" : "Customer"}',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                    ),
                  ] else ...[
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: _selectedRole == 'supplier' ? 'Plant / Business Name' : 'Full Name',
                        hintText: _selectedRole == 'supplier' ? 'e.g. City Springs Water Plant' : 'e.g. Alex Johnson',
                        prefixIcon: const Icon(Icons.badge_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: 'Email Address',
                        hintText: 'name@example.com',
                        prefixIcon: const Icon(Icons.email_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Password (min. 6 characters)',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: 'Mobile Number (+91)',
                        hintText: '+91 98765 43210',
                        prefixIcon: const Icon(Icons.phone_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Zomato-Style Location Detection & Map Selection
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _selectedRole == 'supplier' ? 'PLANT / HUB LOCATION' : 'DELIVERY LOCATION & ADDRESS',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                              ),
                              const Row(
                                children: [
                                  Icon(Icons.my_location, color: AquaTheme.primary, size: 14),
                                  SizedBox(width: 3),
                                  Text('Live Location', style: TextStyle(fontSize: 10, color: AquaTheme.primary, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // Dual Action Buttons: Use GPS & Choose on Map
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: _isDetectingLocation ? null : _handleGpsAutoDetect,
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF0FDF4),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFF86EFAC)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        _isDetectingLocation
                                            ? const SizedBox(
                                                width: 14,
                                                height: 14,
                                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.green),
                                              )
                                            : const Icon(Icons.my_location, color: Color(0xFF16A34A), size: 15),
                                        const SizedBox(width: 6),
                                        Text(
                                          _isDetectingLocation ? 'Locating...' : 'Use GPS',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF15803D)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: InkWell(
                                  onTap: _openZomatoMapPicker,
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEFF6FF),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFBFDBFE)),
                                    ),
                                    child: const Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.map_outlined, color: Color(0xFF2563EB), size: 15),
                                        SizedBox(width: 6),
                                        Text(
                                          'Set on Map',
                                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1D4ED8)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          TextField(
                            controller: _addressController,
                            maxLines: 2,
                            decoration: InputDecoration(
                              labelText: _selectedRole == 'supplier' ? 'Plant Address / Fulfillment Hub' : 'Delivery Address (Home / Office)',
                              hintText: _selectedRole == 'supplier'
                                  ? 'Plot No., Industrial Area, Locality, City'
                                  : 'Flat / House No., Apartment, Area, City',
                              prefixIcon: const Icon(Icons.location_on, color: Colors.redAccent, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                          if (_addressController.text.isNotEmpty)
                            const Padding(
                              padding: EdgeInsets.only(top: 6.0),
                              child: Row(
                                children: [
                                  Icon(Icons.check_circle, color: Colors.green, size: 13),
                                  SizedBox(width: 4),
                                  Text(
                                    'Location verified: Ready for localized water dispatch',
                                    style: TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton(
                      onPressed: auth.isLoading ? null : _handleRegister,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AquaTheme.primary,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: auth.isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : Text(
                              'Create ${_selectedRole == "supplier" ? "Supplier" : "Customer"} Account',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const Center(
                    child: Text(
                      'Cross-Platform • Android • iOS • Web',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
