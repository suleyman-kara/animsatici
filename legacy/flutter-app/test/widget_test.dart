import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kampus_radar/core/constants.dart';
import 'package:kampus_radar/models/monitor.dart';
import 'package:kampus_radar/models/catalog_item.dart';

void main() {
  test('Monitor JSON serialization smoke test', () {
    final monitor = Monitor(
      id: 'test_1',
      title: 'inzva AI Camp',
      url: 'https://inzva.com/events',
      userEmail: 'student@example.com',
    );

    expect(monitor.title, 'inzva AI Camp');
    final json = monitor.toJson();
    expect(json['id'], 'test_1');

    final fromJson = Monitor.fromJson(json);
    expect(fromJson.title, 'inzva AI Camp');
  });

  test('CatalogItem serialization smoke test', () {
    final item = CatalogItem(
      id: 'coderspace',
      title: 'Coderspace Hackathons',
      category: 'ceng',
      description: 'Test description',
      url: 'https://coderspace.io',
      tags: ['hackathon', 'ai'],
      icon: '🚀',
    );

    expect(item.title, 'Coderspace Hackathons');
    expect(item.tags.length, 2);
  });

  test('AppConstants basic values', () {
    expect(AppConstants.appName, 'KampüsRadar');
    expect(AppConstants.primary, const Color(0xFF2563EB));
  });
}
