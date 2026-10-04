import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants.dart';
import '../../models/catalog_item.dart';
import '../../models/opportunity.dart';
import '../../services/firestore_service.dart';
import '../../widgets/expandable_opportunity_card.dart';

class CompanyDetailScreen extends StatefulWidget {
  final CatalogItem item;
  final String userId;
  final String userEmail;

  const CompanyDetailScreen({
    super.key,
    required this.item,
    required this.userId,
    required this.userEmail,
  });

  @override
  State<CompanyDetailScreen> createState() => _CompanyDetailScreenState();
}

class _CompanyDetailScreenState extends State<CompanyDetailScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  bool _isFollowing = false;
  bool _isLoadingFollow = true;

  @override
  void initState() {
    super.initState();
    _checkFollowStatus();
  }

  Future<void> _checkFollowStatus() async {
    try {
      final monitors = await _firestoreService.getMonitors(widget.userId);
      final isTracked = monitors.any((m) => m.url == widget.item.url);
      if (mounted) {
        setState(() {
          _isFollowing = isTracked;
          _isLoadingFollow = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingFollow = false);
    }
  }

  Future<void> _toggleFollow() async {
    final messenger = ScaffoldMessenger.of(context);
    final prev = _isFollowing;
    setState(() => _isFollowing = !prev);

    try {
      final res = await _firestoreService.toggleFollowCompany(
        userId: widget.userId,
        userEmail: widget.userEmail,
        title: widget.item.title,
        url: widget.item.url,
      );
      if (mounted) {
        setState(() => _isFollowing = res);
        messenger.showSnackBar(
          SnackBar(
            content: Text(res ? '✅ ${widget.item.title} takibe alındı!' : 'Takipten çıkarıldı.'),
            backgroundColor: res ? AppConstants.success : Colors.grey.shade800,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isFollowing = prev);
        messenger.showSnackBar(
          SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _openReportDialog() {
    String selectedType = 'Eksik Etkinlik';
    final descCtrl = TextEditingController();

    final reportTypes = [
      'Eksik Etkinlik',
      'Hatalı Tarih veya Bilgi',
      'Bozuk / Açılmayan Web Bağlantısı',
      'Eski / Tamamlanmış Etkinlik',
      'Diğer',
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.flag_rounded, color: Colors.red, size: 20),
              ),
              const SizedBox(width: 10),
              const Text('Şikayet / Bildirim', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${widget.item.title} hakkında eksik veya hatalı bir bilgi mi var? Yöneticilere bildirin.',
                  style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                ),
                const SizedBox(height: 16),
                const Text('Bildirim Türü', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: selectedType,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: reportTypes.map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 13)))).toList(),
                  onChanged: (val) {
                    if (val != null) setModalState(() => selectedType = val);
                  },
                ),
                const SizedBox(height: 14),
                const Text('Açıklama & Detay', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                TextField(
                  controller: descCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Örn: Şu tarihteki kamp ertelendi, link güncellenmeli...',
                    hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                    contentPadding: const EdgeInsets.all(12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
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
                  await _firestoreService.submitReport(
                    companyId: widget.item.id,
                    companyTitle: widget.item.title,
                    reportType: selectedType,
                    description: descCtrl.text.trim(),
                    userEmail: widget.userEmail,
                    userId: widget.userId,
                  );
                  nav.pop();
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('✅ Geri bildiriminiz alındı, incelemeye alınacaktır. Teşekkürler!'),
                      backgroundColor: Colors.green,
                    ),
                  );
                } catch (e) {
                  messenger.showSnackBar(SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red));
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Bildir'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.background,
      appBar: AppBar(
        title: Text(widget.item.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.flag_outlined, color: Colors.red),
            tooltip: 'Hatalı / Eksik Etkinlik Bildir',
            onPressed: _openReportDialog,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Şirket Başlık Kartı
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppConstants.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppConstants.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Text(
                            widget.item.icon,
                            style: const TextStyle(fontSize: 28),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.item.title,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppConstants.textPrimary),
                            ),
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () => launchUrl(Uri.parse(widget.item.url), mode: LaunchMode.externalApplication),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Flexible(
                                    child: Text(
                                      widget.item.url,
                                      style: const TextStyle(fontSize: 12, color: AppConstants.primary, decoration: TextDecoration.underline),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.open_in_new_rounded, size: 12, color: AppConstants.primary),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.item.description,
                    style: const TextStyle(fontSize: 13, color: AppConstants.textSecondary, height: 1.5),
                  ),
                  const SizedBox(height: 16),

                  // Etiketler
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: widget.item.tags.map((tag) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppConstants.slate100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('#$tag', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppConstants.textSecondary)),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  const Divider(height: 1),
                  const SizedBox(height: 16),

                  // Eylemler: Takip Butonu & Şikayet Butonu
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isLoadingFollow ? null : _toggleFollow,
                          icon: Icon(
                            _isFollowing ? Icons.check_circle_rounded : Icons.bookmark_add_rounded,
                            size: 18,
                          ),
                          label: Text(
                            _isFollowing ? 'Takip Ediliyor' : 'Takip Et',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isFollowing ? Colors.green.shade700 : AppConstants.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton.icon(
                        onPressed: _openReportDialog,
                        icon: const Icon(Icons.flag_outlined, size: 16, color: Colors.red),
                        label: const Text('Şikayet Bildir', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.red)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                          side: BorderSide(color: Colors.red.shade200),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Başvurusu Aktif veya Gelecekteki Etkinlikler Başlığı
            const Row(
              children: [
                Icon(Icons.event_available_rounded, size: 20, color: AppConstants.primary),
                SizedBox(width: 8),
                Text(
                  'Aktif ve Gelecekteki Etkinlikler',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Etkinlik Listesi StreamBuilder
            StreamBuilder<List<Opportunity>>(
              stream: _firestoreService.getOpportunitiesStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }

                final allOpps = snapshot.data ?? [];
                // Bu şirkete ait olanları filtrele
                final companyOpps = allOpps.where((opp) {
                  final matchesId = opp.sourceId != null && (opp.sourceId == widget.item.id);
                  final matchesUrl = opp.sourceUrl.isNotEmpty && widget.item.url.contains(opp.sourceUrl);
                  final matchesTitle = opp.sourceTitle.toLowerCase().contains(widget.item.title.toLowerCase()) ||
                      widget.item.title.toLowerCase().contains(opp.sourceTitle.toLowerCase());
                  return matchesId || matchesUrl || matchesTitle;
                }).toList();

                if (companyOpps.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppConstants.border),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.event_busy_rounded, size: 36, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text(
                          'Şu An Aktif Duyuru / Etkinlik Bulunmuyor',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Merkezi radarımız bu kaynağı her gün 19:00\'da taramaktadır. Yeni bir duyuru çıktığında anında burada listelenecektir.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: companyOpps.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    return ExpandableOpportunityCard(
                      opportunity: companyOpps[index],
                      userId: widget.userId,
                      userEmail: widget.userEmail,
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
}
