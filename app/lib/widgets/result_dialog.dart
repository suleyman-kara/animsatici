import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../services/calendar_service.dart';

class ResultDialog extends StatelessWidget {
  final Map<String, dynamic> resultData;

  const ResultDialog({super.key, required this.resultData});

  @override
  Widget build(BuildContext context) {
    final result = resultData['result'] ?? {};
    final bool changed = result['changed'] == true;
    final String? summary = result['summary'] ?? resultData['monitor']?['lastSummary'];
    final String? calendarUrl = result['calendarUrl'];
    final String? error = result['error'];

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Başlık & İkon
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: changed ? AppConstants.emerald50 : Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      changed ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                      color: changed ? AppConstants.success : AppConstants.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          changed ? 'Yeni Etkinlik / Değişiklik!' : 'Sayfa Kontrol Edildi',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppConstants.textPrimary,
                          ),
                        ),
                        Text(
                          changed
                              ? 'Gemini 3.6 AI ile analiz edildi.'
                              : 'Sayfada yeni bir güncelleme tespit edilmedi.',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppConstants.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              if (error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    'Hata: $error',
                    style: TextStyle(fontSize: 12, color: Colors.red.shade700),
                  ),
                ),
              ] else if (summary != null && summary.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppConstants.slate50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppConstants.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.auto_awesome, size: 14, color: AppConstants.primary),
                          const SizedBox(width: 6),
                          const Text(
                            'Yapay Zeka Özeti:',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppConstants.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        summary,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppConstants.textPrimary,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Google Takvim Butonu
              if (calendarUrl != null && calendarUrl.isNotEmpty) ...[
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton.icon(
                    onPressed: () => CalendarService.openUrl(calendarUrl),
                    icon: const Icon(Icons.calendar_today_rounded, size: 18),
                    label: const Text(
                      '📅 Google Takvim\'e Ekle',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A), // Emerald green
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],

              // Kapat Butonu
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Kapat'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
