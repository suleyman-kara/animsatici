import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/notification_preferences.dart';
import '../services/firestore_service.dart';

class NotificationPreferencesDialog extends StatefulWidget {
  final String userId;
  final String userEmail;

  const NotificationPreferencesDialog({
    super.key,
    required this.userId,
    required this.userEmail,
  });

  @override
  State<NotificationPreferencesDialog> createState() => _NotificationPreferencesDialogState();
}

class _NotificationPreferencesDialogState extends State<NotificationPreferencesDialog> {
  final FirestoreService _firestoreService = FirestoreService();
  final _emailController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  String _mode = 'daily_digest'; // 'daily_digest' or 'instant'
  String _hour = '19:00';
  bool _emailEnabled = true;

  final List<String> _availableHours = [
    '17:00',
    '18:00',
    '19:00 (Önerilen)',
    '20:00',
    '21:00',
    '22:00',
  ];

  @override
  void initState() {
    super.initState();
    _emailController.text = widget.userEmail;
    _loadPreferences();
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _loadPreferences() async {
    final prefs = await _firestoreService.getUserPreferences(widget.userId, widget.userEmail);
    if (mounted) {
      setState(() {
        _mode = prefs.notificationMode;
        _hour = prefs.preferredHour.contains('19:00') ? '19:00 (Önerilen)' : prefs.preferredHour;
        _emailController.text = prefs.notificationEmail;
        _emailEnabled = prefs.emailEnabled;
        _isLoading = false;
      });
    }
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final cleanHour = _hour.replaceAll(' (Önerilen)', '');
      final prefs = NotificationPreferences(
        notificationMode: _mode,
        preferredHour: cleanHour,
        notificationEmail: _emailController.text.trim(),
        emailEnabled: _emailEnabled,
      );

      await _firestoreService.saveUserPreferences(widget.userId, prefs);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Bildirim tercihleriniz başarıyla kaydedildi!'),
            backgroundColor: AppConstants.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata oluştu: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _isLoading
              ? const SizedBox(
                  height: 200,
                  child: Center(child: CircularProgressIndicator()),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppConstants.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.notifications_active_outlined,
                            color: AppConstants.primary,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Bildirim Tercihlerim',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppConstants.textPrimary,
                                ),
                              ),
                              Text(
                                'Fırsatların size ne zaman ulaşacağını belirleyin',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppConstants.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Bildirim Modu',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppConstants.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Mod Seçenekleri
                    InkWell(
                      onTap: () => setState(() => _mode = 'daily_digest'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _mode == 'daily_digest'
                              ? AppConstants.primary.withValues(alpha: 0.08)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _mode == 'daily_digest'
                                ? AppConstants.primary
                                : AppConstants.border,
                            width: _mode == 'daily_digest' ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _mode == 'daily_digest' ? Icons.radio_button_checked : Icons.radio_button_off,
                              color: _mode == 'daily_digest' ? AppConstants.primary : Colors.grey,
                              size: 22,
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '🌅 Günün Özeti (Akşam Bülteni)',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: AppConstants.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    'Günün tüm yeni hackathon ve fırsatları belirlediğiniz saatte tek seferde gelir.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppConstants.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () => setState(() => _mode = 'instant'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _mode == 'instant'
                              ? AppConstants.primary.withValues(alpha: 0.08)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _mode == 'instant'
                                ? AppConstants.primary
                                : AppConstants.border,
                            width: _mode == 'instant' ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _mode == 'instant' ? Icons.radio_button_checked : Icons.radio_button_off,
                              color: _mode == 'instant' ? AppConstants.primary : Colors.grey,
                              size: 22,
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '⚡ Anında Bildirim',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: AppConstants.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    'Takip ettiğiniz sitelerde yeni bir fırsat yakalandığı an bildirim alırsınız.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppConstants.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_mode == 'daily_digest') ...[
                      const Text(
                        'Özet Bülteni Saati',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        initialValue: _availableHours.contains(_hour) ? _hour : _availableHours[2],
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          prefixIcon: const Icon(Icons.access_time, size: 18),
                        ),
                        items: _availableHours.map((h) {
                          return DropdownMenuItem(value: h, child: Text(h, style: const TextStyle(fontSize: 13)));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _hour = val);
                        },
                      ),
                      const SizedBox(height: 16),
                    ],
                    const Text(
                      'Bildirim E-posta Adresi',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppConstants.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        prefixIcon: const Icon(Icons.email_outlined, size: 18),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _save,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppConstants.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _isSaving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('Tercihlerimi Kaydet', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
