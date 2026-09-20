import 'package:cloud_firestore/cloud_firestore.dart';

class ScanLog {
  final String id;
  final String? startedAt;
  final String? completedAt;
  final int totalSources;
  final int successCount;
  final int errorCount;
  final int changesDetected;
  final String status; // 'success', 'partial', 'failed'
  final DateTime? createdAt;

  ScanLog({
    required this.id,
    this.startedAt,
    this.completedAt,
    this.totalSources = 0,
    this.successCount = 0,
    this.errorCount = 0,
    this.changesDetected = 0,
    this.status = 'success',
    this.createdAt,
  });

  factory ScanLog.fromMap(String id, Map<String, dynamic> data) {
    DateTime? dt;
    if (data['createdAt'] is Timestamp) {
      dt = (data['createdAt'] as Timestamp).toDate();
    }
    return ScanLog(
      id: id,
      startedAt: data['startedAt'],
      completedAt: data['completedAt'],
      totalSources: data['totalSources'] ?? 0,
      successCount: data['successCount'] ?? 0,
      errorCount: data['errorCount'] ?? 0,
      changesDetected: data['changesDetected'] ?? 0,
      status: data['status'] ?? 'success',
      createdAt: dt,
    );
  }
}
