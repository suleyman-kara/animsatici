import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/constants.dart';
import '../models/monitor.dart';
import '../models/catalog_item.dart';

class ApiService {
  final String baseUrl = AppConstants.apiBaseUrl;

  // Monitörleri listele (Opsiyonel userId parametreli)
  Future<List<Monitor>> getMonitors({String? userId}) async {
    if (baseUrl.isEmpty) return [];
    String url = '$baseUrl/api/monitors';
    if (userId != null && userId.isNotEmpty) {
      url += '?userId=${Uri.encodeComponent(userId)}';
    }
    final res = await http.get(Uri.parse(url));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data['success'] == true && data['monitors'] != null) {
        return (data['monitors'] as List)
            .map((m) => Monitor.fromJson(m))
            .toList();
      }
    }
    throw Exception('Monitörler yüklenemedi.');
  }

  // Yeni monitör ekle
  Future<Monitor> addMonitor({
    required String title,
    required String url,
    required String userEmail,
    String? userId,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/monitors'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'title': title,
        'url': url,
        'userEmail': userEmail,
        'userId': userId ?? 'default_user',
      }),
    );

    final data = jsonDecode(res.body);
    if (res.statusCode == 201 && data['success'] == true) {
      return Monitor.fromJson(data['monitor']);
    } else {
      throw Exception(data['error'] ?? 'Monitör eklenemedi.');
    }
  }

  // Monitörü sil
  Future<bool> deleteMonitor(String id) async {
    final res = await http.delete(Uri.parse('$baseUrl/api/monitors/$id'));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['success'] == true;
    }
    return false;
  }

  // Monitörü test et (Şimdi Kontrol Et / Simüle Et)
  Future<Map<String, dynamic>> checkMonitor(String id, {bool simulate = false}) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/monitors/$id/check'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'simulateChange': simulate}),
    );

    final data = jsonDecode(res.body);
    if (res.statusCode == 200 && data['success'] == true) {
      return data;
    } else {
      throw Exception(data['error'] ?? 'Kontrol başarısız oldu.');
    }
  }

  // Küratörlü kataloğu ve kategorileri getir
  Future<Map<String, dynamic>> getCatalog({String? category}) async {
    if (baseUrl.isEmpty) {
      throw Exception('Yerel API kapalı, yerleşik katalog kullanılıyor.');
    }
    String url = '$baseUrl/api/catalog';
    if (category != null && category != 'all') {
      url += '?category=$category';
    }

    final res = await http.get(Uri.parse(url));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        final categories = (data['categories'] as List? ?? [])
            .map((c) => CatalogCategory.fromJson(c))
            .toList();
        final items = (data['items'] as List? ?? [])
            .map((i) => CatalogItem.fromJson(i))
            .toList();
        return {
          'categories': categories,
          'items': items,
        };
      }
    }
    throw Exception('Katalog yüklenemedi.');
  }

  // Aday havuzuna yeni kanal öner
  Future<bool> suggestChannel({
    required String title,
    required String url,
    required String category,
    String? suggestedBy,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/catalog/suggest'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'title': title,
        'url': url,
        'category': category,
        'suggestedBy': suggestedBy ?? 'anonymous',
      }),
    );
    final data = jsonDecode(res.body);
    return res.statusCode == 201 && data['success'] == true;
  }
}
