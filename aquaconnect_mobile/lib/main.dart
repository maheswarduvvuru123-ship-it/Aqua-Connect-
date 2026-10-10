import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_performance/firebase_performance.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
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

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // 1. Firebase Crashlytics Setup
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);
    await FirebaseCrashlytics.instance.setCustomKey('app_version', '1.0.0');
    await FirebaseCrashlytics.instance.setCustomKey('release_version', 'v1.0.0');
    await FirebaseCrashlytics.instance.setCustomKey('environment', 'production');

    // Forward unhandled Flutter framework errors to Crashlytics
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    };

    // Forward unhandled asynchronous errors to Crashlytics
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true; // Mark handled so app doesn't abruptly crash on older devices
    };

    // 2. Firebase Performance Monitoring Setup
    final performance = FirebasePerformance.instance;
    await performance.setPerformanceCollectionEnabled(true);
    final Trace startupTrace = performance.newTrace('app_startup_trace');
    await startupTrace.start();

    // 3. Firebase Release Monitoring & Analytics Setup (v1.0.0)
    final analytics = FirebaseAnalytics.instance;
    await analytics.setAnalyticsCollectionEnabled(true);
    await analytics.logAppOpen();
    await analytics.logEvent(
      name: 'release_monitor_v1_0_0',
      parameters: {
        'version': '1.0.0',
        'build': '1',
        'platform': 'android',
        'release_status': 'production_verified',
      },
    );

    await startupTrace.stop();
  } catch (e) {
    debugPrint('Firebase Observability initialization error: $e');
  }

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

  static FirebaseAnalytics analytics = FirebaseAnalytics.instance;
  static FirebaseAnalyticsObserver observer =
      FirebaseAnalyticsObserver(analytics: analytics);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AquaConnect',
      debugShowCheckedModeBanner: false,
      theme: AquaTheme.lightTheme,
      navigatorObservers: <NavigatorObserver>[observer],
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
