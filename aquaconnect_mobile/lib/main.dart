import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/water_delivery_provider.dart';
import 'screens/welcome_screen.dart';
import 'screens/supplier_dashboard_screen.dart';
import 'screens/customer_home_screen.dart';
import 'utils/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Safeguard: Prevent unhandled asynchronous errors from crashing the app on older devices
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('AquaConnect Uncaught Exception: $error');
    return true; // Mark handled so process doesn't terminate
  };

  // Safeguard: Catch Flutter layout and widget errors
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('AquaConnect Flutter Error: ${details.exceptionAsString()}');
  };

  // Graceful fallback UI instead of crashing or showing red screen of death
  ErrorWidget.builder = (FlutterErrorDetails errorDetails) {
    return Material(
      color: Colors.white,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.info_outline, color: AquaTheme.primary, size: 36),
              const SizedBox(height: 8),
              const Text(
                'Content temporarily unavailable',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                'Please pull to refresh or re-open the screen.',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  };

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('Firebase initialization warning: $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => WaterDeliveryProvider()),
      ],
      child: const AquaConnectApp(),
    ),
  );
}

class AquaConnectApp extends StatelessWidget {
  const AquaConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AquaConnect',
      debugShowCheckedModeBanner: false,
      theme: AquaTheme.lightTheme,
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (!auth.isAuthenticated) {
            return const WelcomeScreen();
          }
          if (auth.userRole == 'supplier') {
            return const SupplierDashboardScreen();
          }
          return const CustomerHomeScreen();
        },
      ),
    );
  }
}
