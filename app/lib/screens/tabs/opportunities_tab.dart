import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants.dart';
import '../../models/opportunity.dart';
import '../../services/firestore_service.dart';

class OpportunitiesTab extends StatefulWidget {
  final bool isAdmin;

  const OpportunitiesTab({
    super.key,
    this.isAdmin = false,
  });

  @override
  State<OpportunitiesTab> createState() => _OpportunitiesTabState();
}

class _OpportunitiesTabState extends State<OpportunitiesTab> {
  final FirestoreService _firestoreService = FirestoreService();
  String _selectedCategory = 'all';

  final List<Map<String, String>> _categories = [
    {'id': 'all', 'label': '✨ Tümü'},
    {'id': 'hackathon', 'label': '🏆 Hackathon'},
    {'id': 'ai', 'label': '🤖 Yapay Zeka'},
    {'id': 'career', 'label': '💼 Staj & Kariyer'},
    {'id': 'ceng', 'label': '💻 CENG & Kodlama'},
    {'id': 'university', 'label': '🎓 Kampüs & SKS'},
  ];

  Future<void> _openEditDialog(Opportunity opp) async {
    final titleCtrl = TextEditingController(text: opp.eventTitle ?? opp.sourceTitle);
    final dateCtrl = TextEditingController(text: opp.eventStartDate ?? '');
    final summaryCtrl = TextEditingController(text: opp.summary);
    final calUrlCtrl = TextEditingController(text: opp.calendarUrl ?? '');

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Etkinlik Detaylarını Düzenle', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Etkinlik Başlığı'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: dateCtrl,
                decoration: const InputDecoration(
                  labelText: 'Başlangıç Tarihi (ISO 8601)',
                  hintText: '2026-10-25T18:00:00',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: summaryCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Yapay Zeka Özeti'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: calUrlCtrl,
                decoration: const InputDecoration(labelText: 'Google Takvim Bağlantısı'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Vazgeç'),
          ),
          ElevatedButton(
            onPressed: () async {
              final nav = Navigator.of(ctx);
              final messenger = ScaffoldMessenger.of(context);
              try {
                await _firestoreService.updateOpportunityData(opp.id, {
                  'eventDetails.title': titleCtrl.text.trim(),
                  'eventDetails.startDate': dateCtrl.text.trim(),
                  'summary': summaryCtrl.text.trim(),
                  'calendarUrl': calUrlCtrl.text.trim(),
                  'status': 'approved', // Düzenlenince doğrudan onaylıya al
                });
                nav.pop();
                messenger.showSnackBar(
                  const SnackBar(content: Text('✅ Etkinlik güncellendi ve onaylandı!'), backgroundColor: Colors.green),
                );
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Kaydet & Onayla'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleStatusChange(Opportunity opp, String newStatus) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await _firestoreService.updateOpportunityStatus(opp.id, newStatus);
      messenger.showSnackBar(
        SnackBar(
          content: Text(newStatus == 'approved' ? '✅ Etkinlik onaylandı ve yayında!' : '🚫 Etkinlik reddedildi.'),
          backgroundColor: newStatus == 'approved' ? Colors.green : Colors.grey.shade800,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('İşlem başarısız: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _handleDelete(Opportunity opp) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Etkinliği Sil?'),
        content: Text('"${opp.eventTitle ?? opp.sourceTitle}" fırsat havuzundan silinsin mi?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Vazgeç')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sil'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _firestoreService.deleteOpportunity(opp.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner
          _buildBanner(),
          const SizedBox(height: 20),

          // Kategori Çipleri
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _categories.map((c) {
                final isSelected = _selectedCategory == c['id'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    selected: isSelected,
                    label: Text(c['label']!),
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? Colors.white : AppConstants.textPrimary,
                    ),
                    backgroundColor: Colors.white,
                    selectedColor: AppConstants.primary,
                    checkmarkColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(
                        color: isSelected ? AppConstants.primary : AppConstants.border,
                      ),
                    ),
                    onSelected: (_) => setState(() => _selectedCategory = c['id']!),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),

          // Etkinlik Akışı StreamBuilder
          StreamBuilder<List<Opportunity>>(
            stream: _firestoreService.getOpportunitiesStream(includeAll: widget.isAdmin),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(),
                  ),
                );
              }

              final allOpps = snapshot.data ?? [];

              // Kategoriye göre filtrele
              final filtered = allOpps.where((opp) {
                if (_selectedCategory == 'all') return true;
                return opp.category.toLowerCase().contains(_selectedCategory.toLowerCase());
              }).toList();

              if (filtered.isEmpty) {
                return _buildEmptyState();
              }

              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                separatorBuilder: (_, _) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  return _buildOpportunityCard(filtered[index]);
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppConstants.primary.withValues(alpha: 0.25),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.radar_rounded, color: Colors.white, size: 14),
                    SizedBox(width: 6),
                    Text(
                      '7/24 Otonom Radar',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              if (widget.isAdmin)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade300),
                  ),
                  child: const Text(
                    '👑 Yönetici Modu',
                    style: TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Fırsatlar & Etkinlik Zaman Tüneli',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            'Web sitelerindeki yeni duyurular yapay zeka tarafından taranır ve takviminize işlenmeye hazır hale getirilir.',
            style: TextStyle(fontSize: 12, color: Colors.blue.shade100, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppConstants.border),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.event_available_rounded, size: 36, color: AppConstants.primary),
          ),
          const SizedBox(height: 16),
          const Text(
            'Bu Kategoride Henüz Fırsat Yok',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
          ),
          const SizedBox(height: 6),
          const Text(
            'Merkezi radar her gün saat 19:00\'da kaynakları tarar. Yeni bir hackathon, kamp veya duyuru yakalandığında anında buraya işlenir.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _buildOpportunityCard(Opportunity opp) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: opp.isUpdated
              ? Colors.amber.shade300
              : (opp.isPendingReview ? Colors.orange.shade200 : AppConstants.border),
          width: opp.isUpdated || opp.isPendingReview ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Üst Rozet Satırı
          Row(
            children: [
              // Kaynak Adı
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.source_rounded, size: 12, color: AppConstants.primary),
                    const SizedBox(width: 4),
                    Text(
                      opp.sourceTitle,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppConstants.primary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Güncellendi veya İptal Rozeti
              if (opp.isUpdated)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade300),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.update_rounded, size: 12, color: Colors.amber),
                      SizedBox(width: 4),
                      Text('🔄 Tarih Güncellendi', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.amber)),
                    ],
                  ),
                )
              else if (opp.isCancelled)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: const Text('🚫 İptal Edildi', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.red)),
                ),

              const Spacer(),

              // Admin Görünümü: Onay Bekliyor / Onaylı Rozeti
              if (widget.isAdmin)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: opp.isApproved
                        ? Colors.green.shade50
                        : (opp.isPendingReview ? Colors.orange.shade50 : Colors.red.shade50),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    opp.isApproved ? '🟢 ONAYLI' : (opp.isPendingReview ? '🟡 BEKLİYOR' : '🔴 REDDEDİLDİ'),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: opp.isApproved
                          ? Colors.green.shade800
                          : (opp.isPendingReview ? Colors.orange.shade800 : Colors.red.shade800),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Başlık
          Text(
            opp.eventTitle ?? opp.sourceTitle,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppConstants.textPrimary),
          ),
          const SizedBox(height: 6),

          // Tarih Bilgisi (Varsa)
          if (opp.eventStartDate != null && opp.eventStartDate!.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.event_rounded, size: 14, color: Color(0xFF475569)),
                  const SizedBox(width: 6),
                  Text(
                    'Etkinlik Tarihi: ${_formatDateTime(opp.eventStartDate!)}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Yapay Zeka Özeti
          Text(
            opp.summary,
            style: const TextStyle(fontSize: 13, color: AppConstants.textSecondary, height: 1.45),
          ),
          const SizedBox(height: 16),

          const Divider(height: 1),
          const SizedBox(height: 12),

          // Alt Eylemler
          Row(
            children: [
              // 1. Google Takvim'e Ekle Butonu
              if (opp.calendarUrl != null && opp.calendarUrl!.isNotEmpty)
                ElevatedButton.icon(
                  onPressed: () => launchUrl(Uri.parse(opp.calendarUrl!), mode: LaunchMode.externalApplication),
                  icon: const Icon(Icons.calendar_month_rounded, size: 16),
                  label: const Text('Google Takvim\'e Ekle', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
              const SizedBox(width: 8),

              // 2. Kaynağa Git Butonu
              OutlinedButton.icon(
                onPressed: () => launchUrl(Uri.parse(opp.sourceUrl), mode: LaunchMode.externalApplication),
                icon: const Icon(Icons.open_in_new_rounded, size: 14),
                label: const Text('Kaynağa Git', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppConstants.textPrimary,
                  side: const BorderSide(color: AppConstants.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),

              const Spacer(),

              // Admin Eylemleri
              if (widget.isAdmin) ...[
                if (opp.isPendingReview) ...[
                  IconButton(
                    icon: const Icon(Icons.check_circle_rounded, color: Colors.green),
                    tooltip: 'Onayla & Yayına Al',
                    onPressed: () => _handleStatusChange(opp, 'approved'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.cancel_rounded, color: Colors.red),
                    tooltip: 'Reddet',
                    onPressed: () => _handleStatusChange(opp, 'rejected'),
                  ),
                ],
                IconButton(
                  icon: const Icon(Icons.edit_rounded, color: Colors.blue, size: 20),
                  tooltip: 'Düzenle',
                  onPressed: () => _openEditDialog(opp),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, color: Colors.grey, size: 20),
                  tooltip: 'Sil',
                  onPressed: () => _handleDelete(opp),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _formatDateTime(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('dd.MM.yyyy HH:mm').format(dt);
    } catch (_) {
      return isoString;
    }
  }
}
