import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../models/monitor.dart';
import '../../services/calendar_service.dart';

class MonitorCard extends StatelessWidget {
  final Monitor monitor;
  final bool isChecking;
  final VoidCallback onCheck;
  final VoidCallback onSimulate;
  final VoidCallback onDelete;

  const MonitorCard({
    super.key,
    required this.monitor,
    required this.isChecking,
    required this.onCheck,
    required this.onSimulate,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppConstants.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Üst Satır: İkon, Başlık, Sil
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppConstants.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.language_rounded,
                  color: AppConstants.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      monitor.title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppConstants.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    GestureDetector(
                      onTap: () => CalendarService.openUrl(monitor.url),
                      child: Text(
                        monitor.url,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppConstants.primary.withValues(alpha: 0.8),
                          decoration: TextDecoration.underline,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, size: 18),
                color: Colors.grey.shade400,
                hoverColor: Colors.red.shade50,
                onPressed: onDelete,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Son Özet veya Durum
          if (monitor.lastSummary != null && monitor.lastSummary!.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppConstants.slate50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppConstants.border),
              ),
              child: Text(
                monitor.lastSummary!,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppConstants.textPrimary,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 14),
          ],

          const Spacer(),

          // Alt Satır: Kontrol Et ve Simüle Et Butonları
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: isChecking ? null : onCheck,
                  icon: isChecking
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh_rounded, size: 14),
                  label: const Text('Kontrol Et', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppConstants.primary,
                    side: const BorderSide(color: AppConstants.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isChecking ? null : onSimulate,
                  icon: const Icon(Icons.science_outlined, size: 14),
                  label: const Text('🧪 Simüle Et', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.accentIndigo,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
