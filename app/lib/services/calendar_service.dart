import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart';

class CalendarService {
  // Google Takvim linkini veya harici siteyi aç
  static Future<bool> openUrl(String urlString) async {
    final Uri uri = Uri.parse(urlString);
    try {
      return await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
    } catch (e) {
      debugPrint('URL Açma Hatası: $e');
      return false;
    }
  }
}
