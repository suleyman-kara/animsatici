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
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyA3BdH6GY-jGMcwwgaXKvPzbxqFeg1wwcE',
    appId: '1:51805689450:web:51761f4185675e9a10dc13',
    messagingSenderId: '51805689450',
    projectId: 'kampus-radar',
    authDomain: 'kampus-radar.firebaseapp.com',
    storageBucket: 'kampus-radar.firebasestorage.app',
    measurementId: 'G-7XF4452JWQ',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA3BdH6GY-jGMcwwgaXKvPzbxqFeg1wwcE',
    appId: '1:51805689450:android:51761f4185675e9a10dc13',
    messagingSenderId: '51805689450',
    projectId: 'kampus-radar',
    storageBucket: 'kampus-radar.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyA3BdH6GY-jGMcwwgaXKvPzbxqFeg1wwcE',
    appId: '1:51805689450:ios:51761f4185675e9a10dc13',
    messagingSenderId: '51805689450',
    projectId: 'kampus-radar',
    storageBucket: 'kampus-radar.firebasestorage.app',
  );
}
