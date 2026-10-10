import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:aquaconnect_mobile/main.dart';
import 'package:aquaconnect_mobile/providers/auth_provider.dart';
import 'package:aquaconnect_mobile/providers/cart_provider.dart';
import 'package:aquaconnect_mobile/providers/water_delivery_provider.dart';

void main() {
  testWidgets('AquaConnectApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => CartProvider()),
          ChangeNotifierProvider(create: (_) => WaterDeliveryProvider()),
        ],
        child: const AquaConnectApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('AquaConnect'), findsWidgets);
  });
}
