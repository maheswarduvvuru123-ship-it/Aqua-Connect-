// File generated for AquaConnect Firebase Configuration
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        return android;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDPlWeOhCpAPQ2Y_kPga0LmgAyPs2H7CZU',
    appId: '1:818962725324:android:d7d70d99fb20aa896d4569',
    messagingSenderId: '818962725324',
    projectId: 'aqua-ec4f5',
    storageBucket: 'aqua-ec4f5.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDPlWeOhCpAPQ2Y_kPga0LmgAyPs2H7CZU',
    appId: '1:818962725324:android:d7d70d99fb20aa896d4569',
    messagingSenderId: '818962725324',
    projectId: 'aqua-ec4f5',
    storageBucket: 'aqua-ec4f5.firebasestorage.app',
  );
}
