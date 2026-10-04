import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../models/opportunity.dart';
import '../../models/user_profile.dart';
import '../../services/firestore_service.dart';
import '../../widgets/expandable_opportunity_card.dart';

class OpportunitiesTab extends StatefulWidget {
  final String userId;
  final String userEmail;
  final bool isAdmin;

  const OpportunitiesTab({
    super.key,
    required this.userId,
    required this.userEmail,
    this.isAdmin = false,
  });

  @override
  State<OpportunitiesTab> createState() => _OpportunitiesTabState();
}

class _OpportunitiesTabState extends State<OpportunitiesTab> {
  final FirestoreService _firestoreService = FirestoreService();
  String _selectedCategory = 'all';
  UserProfile? _userProfile;

  final List<Map<String, String>> _categories = [
    {'id': 'all', 'label': '✨ Tümü'},
    {'id': 'hackathon', 'label': '🏆 Hackathon'},
    {'id': 'ai', 'label': '🤖 Yapay Zeka'},
    {'id': 'career', 'label': '💼 Staj & Kariyer'},
    {'id': 'ceng', 'label': '💻 CENG & Kodlama'},
    {'id': 'university', 'label': '🎓 Kampüs & SKS'},
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await _firestoreService.getUserProfile(widget.userId);
      if (mounted) {
        setState(() => _userProfile = profile);
      }
    } catch (e) {
      debugPrint('Profil yüklenirken hata: $e');
    }
  }

  bool _isRecommended(Opportunity opp) {
    if (_userProfile == null || _userProfile!.interests.isEmpty) return false;
    final interests = _userProfile!.interests.map((i) => i.toLowerCase()).toList();
    final cat = opp.category.toLowerCase();
    final title = (opp.eventTitle ?? opp.sourceTitle).toLowerCase();
    final summary = opp.summary.toLowerCase();

    for (final interest in interests) {
      if (cat.contains(interest) || title.contains(interest) || summary.contains(interest)) {
        return true;
      }
    }
    return false;
  }

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
                  'status': 'approved',
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
                      fontWeight: FontWeight.w700,
                      color: isSelected ? Colors.white : AppConstants.textPrimary,
                    ),
                    backgroundColor: Colors.white,
                    selectedColor: AppConstants.primary,
                    checkmarkColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: isSelected ? AppConstants.primary : AppConstants.border),
                    ),
                    onSelected: (val) {
                      setState(() => _selectedCategory = c['id']!);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),

          // Canlı Fırsatlar Akışı
          StreamBuilder<List<Opportunity>>(
            stream: _firestoreService.streamOpportunities(onlyApproved: !widget.isAdmin),
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

              // İlgi alanlarına göre önerilenleri en üste al
              filtered.sort((a, b) {
                final aRec = _isRecommended(a);
                final bRec = _isRecommended(b);
                if (aRec && !bRec) return -1;
                if (!aRec && bRec) return 1;
                return 0;
              });

              if (filtered.isEmpty) {
                return _buildEmptyState();
              }

              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                separatorBuilder: (_, _) => const SizedBox(height: 14),
                itemBuilder: (context, index) {
                  final opp = filtered[index];
                  final isRec = _isRecommended(opp);
                  return ExpandableOpportunityCard(
                    opportunity: opp,
                    isAdmin: widget.isAdmin,
                    isRecommended: isRec,
                    userId: widget.userId,
                    userEmail: widget.userEmail,
                    onStatusChanged: widget.isAdmin
                        ? () => _handleStatusChange(opp, opp.isApproved ? 'rejected' : 'approved')
                        : null,
                    onEdit: widget.isAdmin ? () => _openEditDialog(opp) : null,
                    onDelete: widget.isAdmin ? () => _handleDelete(opp) : null,
                  );
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
                    Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 14),
                    SizedBox(width: 6),
                    Text(
                      'Kişiye Özel Fırsatlar',
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
            'Fırsatlar Akışı (Etkinlikler)',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            _userProfile != null && _userProfile!.interests.isNotEmpty
                ? 'İlgi alanlarına (${_userProfile!.interests.take(3).join(', ')}) göre sana özel önerilen etkinlikler ve hackathonlar.'
                : 'Yapay zeka tarafından taranan en güncel kariyer kampları, yarışmalar ve etkinlikler.',
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
            'Merkezi radar kaynakları düzenli olarak tarar. Yeni bir hackathon, kamp veya duyuru yayınlandığında anında buraya işlenir.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, height: 1.5),
          ),
        ],
      ),
    );
  }
}
