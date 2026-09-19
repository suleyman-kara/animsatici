import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../models/monitor.dart';
import '../../services/api_service.dart';
import '../../services/firestore_service.dart';

class AddMonitorDialog extends StatefulWidget {
  final String? initialTitle;
  final String? initialUrl;
  final String userEmail;
  final String? userId;
  final Function(Monitor) onAdded;

  const AddMonitorDialog({
    super.key,
    this.initialTitle,
    this.initialUrl,
    required this.userEmail,
    this.userId,
    required this.onAdded,
  });

  @override
  State<AddMonitorDialog> createState() => _AddMonitorDialogState();
}

class _AddMonitorDialogState extends State<AddMonitorDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _urlController;
  late TextEditingController _emailController;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialTitle ?? '');
    _urlController = TextEditingController(text: widget.initialUrl ?? '');
    _emailController = TextEditingController(text: widget.userEmail);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _urlController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      Monitor newMonitor;
      if (widget.userId != null && widget.userId!.isNotEmpty) {
        final firestoreService = FirestoreService();
        newMonitor = await firestoreService.addMonitor(
          userId: widget.userId!,
          userEmail: _emailController.text.trim(),
          title: _titleController.text.trim().isEmpty ? 'Yeni Takip Sayfası' : _titleController.text.trim(),
          url: _urlController.text.trim(),
        );

        // İsteğe bağlı: Yerel sunucu açıksa oraya da ekle
        try {
          final apiService = ApiService();
          await apiService.addMonitor(
            title: _titleController.text.trim(),
            url: _urlController.text.trim(),
            userEmail: _emailController.text.trim(),
            userId: widget.userId,
          );
        } catch (_) {}
      } else {
        final apiService = ApiService();
        newMonitor = await apiService.addMonitor(
          title: _titleController.text.trim(),
          url: _urlController.text.trim(),
          userEmail: _emailController.text.trim(),
        );
      }

      widget.onAdded(newMonitor);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      widget.initialUrl != null
                          ? 'Kanalı Takibe Al'
                          : 'Yeni Sayfa Takibi Ekle',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppConstants.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Bu sayfadaki duyurular her gün izlenir, takviminize işlenir.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppConstants.textSecondary,
                  ),
                ),
                const SizedBox(height: 20),

                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(fontSize: 12, color: Colors.red.shade700),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Sayfa Başlığı
                TextFormField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    labelText: 'Sayfa / Kanal Başlığı',
                    hintText: 'Örn: inzva Kampları, ÇÜ SKS',
                    prefixIcon: const Icon(Icons.tag_rounded, size: 20),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 14),

                // URL
                TextFormField(
                  controller: _urlController,
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'URL zorunludur.';
                    if (!val.startsWith('http://') && !val.startsWith('https://')) {
                      return 'Lütfen geçerli bir http:// veya https:// URL adresi girin.';
                    }
                    return null;
                  },
                  decoration: InputDecoration(
                    labelText: 'Web Sayfası URL *',
                    hintText: 'https://...',
                    prefixIcon: const Icon(Icons.language_rounded, size: 20),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 14),

                // E-posta
                TextFormField(
                  controller: _emailController,
                  validator: (val) =>
                      val == null || !val.contains('@') ? 'Geçerli bir e-posta girin.' : null,
                  decoration: InputDecoration(
                    labelText: 'Bildirim E-postası *',
                    prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 24),

                // Butonlar
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Vazgeç'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Takibe Al',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
