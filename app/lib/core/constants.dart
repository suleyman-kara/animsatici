import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'KampüsRadar';
  static const String appSlogan = 'CENG ve Kampüs Fırsat Radarı';

  // API Adresi: Web ortamında tarayıcı origin'i veya yerel Node.js portu
  static String get apiBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:3001';
    }
    return defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:3001'
        : 'http://localhost:3001';
  }

  // Renk Paleti
  static const Color primary = Color(0xFF2563EB); // Modern Blue
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color accentIndigo = Color(0xFF4F46E5);
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);
  static const Color success = Color(0xFF10B981);

  // Yardımcı Renkler (Slate, Emerald, Violet)
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate700 = Color(0xFF334155);
  static const Color emerald50 = Color(0xFFECFDF5);
  static const Color emerald200 = Color(0xFFA7F3D0);
  static const Color emerald600 = Color(0xFF059669);
  static const Color emerald700 = Color(0xFF047857);
  static const Color violet = Color(0xFF8B5CF6);
}
