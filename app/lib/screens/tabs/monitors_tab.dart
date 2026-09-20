import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../models/monitor.dart';
import '../../services/api_service.dart';
import '../../services/firestore_service.dart';
import '../../widgets/monitor_card.dart';
import '../../widgets/result_dialog.dart';

class MonitorsTab extends StatefulWidget {
  final List<Monitor> monitors;
  final bool isLoading;
  final String userId;
  final VoidCallback onRefresh;
  final Function(Monitor) onDelete;
  final VoidCallback onSwitchToCatalog;

  const MonitorsTab({
    super.key,
    required this.monitors,
    required this.isLoading,
    required this.userId,
    required this.onRefresh,
    required this.onDelete,
    required this.onSwitchToCatalog,
  });

  @override
  State<MonitorsTab> createState() => _MonitorsTabState();
}

class _MonitorsTabState extends State<MonitorsTab> {
  final ApiService _apiService = ApiService();
  String? _checkingId;

  Future<void> _handleCheck(Monitor monitor, {bool simulate = false}) async {
    setState(() => _checkingId = monitor.id);
    try {
      Map<String, dynamic> res;
      try {
        // 1. Bulut fonksiyonu (Cloud Function checkSourceNow) ile 7/24 sunucusuz kontrol
        final functions = FirebaseFunctions.instanceFor(region: 'us-central1');
        final callable = functions.httpsCallable('checkSourceNow');
        final callResult = await callable.call({
          'url': monitor.url,
          'title': monitor.title,
          'oldText': monitor.lastSummary ?? '',
        });

        final data = Map<String, dynamic>.from(callResult.data as Map);
        final bool changed = data['hasSignificantChange'] == true;
        final String? summary = data['summary'];
        final String? calendarUrl = data['calendarUrl'];

        // Firestore'daki monitörü güncelle
        if (widget.userId.isNotEmpty) {
          final firestoreService = FirestoreService();
          await firestoreService.updateMonitorSummary(widget.userId, monitor.id, summary);
        }

        res = {
          'success': true,
          'result': {
            'changed': changed,
            'summary': summary,
            'calendarUrl': calendarUrl,
          },
          'monitor': {
            'lastSummary': summary,
          }
        };
      } catch (cloudErr) {
        debugPrint('Bulut kontrolü hatası: $cloudErr');
        if (AppConstants.apiBaseUrl.isNotEmpty) {
          res = await _apiService.checkMonitor(monitor.id, simulate: simulate);
        } else {
          rethrow;
        }
      }

      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => ResultDialog(resultData: res),
        );
        widget.onRefresh();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kontrol tamamlanamadı: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _checkingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // İstatistik Kartları
            _buildStatsRow(),
            const SizedBox(height: 24),

            // Bölüm Başlığı
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Takip Ettiğim Sayfalar',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppConstants.textPrimary,
                      ),
                    ),
                    Text(
                      'Yapay zeka her gün tarar, değişiklikleri takviminize işler.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppConstants.textSecondary,
                      ),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: widget.onSwitchToCatalog,
                  icon: const Icon(Icons.explore_outlined, size: 16),
                  label: const Text('Kataloğa Git', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Liste veya Boş Durum
            if (widget.monitors.isEmpty)
              _buildEmptyState()
            else
              LayoutBuilder(
                builder: (context, constraints) {
                  int crossAxisCount = constraints.maxWidth > 900
                      ? 3
                      : constraints.maxWidth > 600
                          ? 2
                          : 1;

                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: crossAxisCount,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      mainAxisExtent: 180,
                    ),
                    itemCount: widget.monitors.length,
                    itemBuilder: (context, index) {
                      final monitor = widget.monitors[index];
                      return MonitorCard(
                        monitor: monitor,
                        isChecking: _checkingId == monitor.id,
                        onCheck: () => _handleCheck(monitor, simulate: false),
                        onSimulate: () => _handleCheck(monitor, simulate: true),
                        onDelete: () => widget.onDelete(monitor),
                      );
                    },
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        final count = widget.monitors.length;

        final items = [
          _buildStatCard('Toplam Takip', '$count', Icons.layers_rounded, AppConstants.primary),
          _buildStatCard('Aktif Taranan', '$count', Icons.check_circle_rounded, AppConstants.success),
          _buildStatCard('Otomatik Tarama', 'Her Akşam 19:00', Icons.schedule_rounded, AppConstants.accentIndigo),
        ];

        if (isWide) {
          return Row(
            children: items.map((i) => Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: i))).toList(),
          );
        } else {
          return Column(
            children: items.map((i) => Padding(padding: const EdgeInsets.only(bottom: 10), child: i)).toList(),
          );
        }
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppConstants.border),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(fontSize: 11, color: AppConstants.textSecondary, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppConstants.border, style: BorderStyle.solid),
      ),
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: AppConstants.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.radar_rounded, color: AppConstants.primary, size: 30),
          ),
          const SizedBox(height: 16),
          const Text(
            'Henüz Takip Eklenmedi',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
          ),
          const SizedBox(height: 6),
          Text(
            'Katalogdan inzva, Coderspace veya SKS gibi hazır kanalları seçebilir ya da dilediğin duyuru linkini ekleyebilirsin.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, height: 1.5),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: widget.onSwitchToCatalog,
            icon: const Icon(Icons.explore_rounded, size: 16),
            label: const Text('Katalogdaki Fırsatlara Göz At', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }
}
