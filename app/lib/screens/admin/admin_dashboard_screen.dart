import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants.dart';
import '../../models/opportunity.dart';
import '../../models/scan_log.dart';
import '../../models/source_health.dart';
import '../../services/firestore_service.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> with SingleTickerProviderStateMixin {
  final FirestoreService _firestoreService = FirestoreService();
  late TabController _tabController;

  String _filterStatus = 'all'; // 'all', 'success', 'error', 'inactive'
  String _oppFilterStatus = 'all'; // 'all', 'pending_review', 'approved', 'rejected'
  final Set<String> _testingIds = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _testSingleSource(SourceHealth source) async {
    setState(() => _testingIds.add(source.id));
    final messenger = ScaffoldMessenger.of(context);

    try {
      final callable = FirebaseFunctions.instanceFor(region: 'us-central1').httpsCallable('checkSourceNow');
      final res = await callable.call({
        'url': source.url,
        'title': source.title,
        'sourceId': source.id,
      });

      final data = Map<String, dynamic>.from(res.data as Map);
      messenger.showSnackBar(
        SnackBar(
          content: Text('✅ ${source.title} başarıyla tarandı (HTTP ${data['httpStatus'] ?? 200}, ${data['latencyMs'] ?? 0}ms)'),
          backgroundColor: Colors.green.shade700,
          duration: const Duration(seconds: 3),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('❌ ${source.title} testinde hata: $e'),
          backgroundColor: Colors.red.shade700,
          duration: const Duration(seconds: 4),
        ),
      );
    } finally {
      if (mounted) setState(() => _testingIds.remove(source.id));
    }
  }

  Future<void> _seedFromCatalog() async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await _firestoreService.seedSourcesFromCatalog();
      messenger.showSnackBar(
        const SnackBar(
          content: Text('📥 Hazır katalogdaki 7 kaynak merkezi sisteme eşitlendi!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Eşitleme hatası: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _openAddSourceDialog() async {
    final titleCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    String category = 'ceng';

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Yeni Merkezi Kaynak Ekle', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleCtrl,
              decoration: const InputDecoration(labelText: 'Kaynak Adı', hintText: 'Örn: ODTÜ Duyurular'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: urlCtrl,
              decoration: const InputDecoration(labelText: 'Web Sayfası URL', hintText: 'https://...'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Vazgeç')),
          ElevatedButton(
            onPressed: () async {
              if (urlCtrl.text.trim().isEmpty) return;
              final nav = Navigator.of(ctx);
              await _firestoreService.addSource(
                title: titleCtrl.text.trim().isEmpty ? 'Yeni Kaynak' : titleCtrl.text.trim(),
                url: urlCtrl.text.trim(),
                category: category,
              );
              nav.pop();
            },
            child: const Text('Ekle'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.amber.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.admin_panel_settings_rounded, color: Colors.amber, size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Yönetici Paneli',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
                ),
                Text(
                  'Merkezi Radar & Kaynak Sağlık Durumu',
                  style: TextStyle(fontSize: 11, color: AppConstants.textSecondary),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: _seedFromCatalog,
            icon: const Icon(Icons.sync_rounded, size: 16),
            label: const Text('Kataloğu Eşitle', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            style: TextButton.styleFrom(foregroundColor: AppConstants.primary),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: AppConstants.primary),
            tooltip: 'Yeni Kaynak Ekle',
            onPressed: _openAddSourceDialog,
          ),
          const SizedBox(width: 12),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppConstants.primary,
          unselectedLabelColor: AppConstants.textSecondary,
          indicatorColor: AppConstants.primary,
          tabs: const [
            Tab(icon: Icon(Icons.dns_rounded, size: 18), text: 'Kaynaklar & Sağlık'),
            Tab(icon: Icon(Icons.event_available_rounded, size: 18), text: 'Fırsatlar & Onay Havuzu'),
            Tab(icon: Icon(Icons.history_rounded, size: 18), text: 'Tarama Günlükleri (Logs)'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSourcesTab(),
          _buildOpportunitiesAdminTab(),
          _buildLogsTab(),
        ],
      ),
    );
  }

  Widget _buildSourcesTab() {
    return StreamBuilder<List<SourceHealth>>(
      stream: _firestoreService.getSourcesStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final sources = snapshot.data ?? [];

        // İstatistikler
        final total = sources.length;
        final successCount = sources.where((s) => s.lastStatus == 'success').length;
        final errorCount = sources.where((s) => s.lastStatus == 'error').length;
        final pendingCount = sources.where((s) => s.lastStatus == 'pending').length;

        // Filtreleme
        final filtered = sources.where((s) {
          if (_filterStatus == 'success') return s.lastStatus == 'success';
          if (_filterStatus == 'error') return s.lastStatus == 'error';
          if (_filterStatus == 'inactive') return !s.isActive;
          return true;
        }).toList();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Özet Metrik Kartları
              Row(
                children: [
                  Expanded(child: _buildMetricCard('Toplam Kaynak', '$total', Icons.language_rounded, Colors.blue)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Başarılı (200 OK)', '$successCount', Icons.check_circle_rounded, Colors.green)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Hatalı / Kesinti', '$errorCount', Icons.error_rounded, Colors.red)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Bekleyen', '$pendingCount', Icons.hourglass_empty_rounded, Colors.orange)),
                ],
              ),
              const SizedBox(height: 20),

              // 2. Filtre Çipleri
              Row(
                children: [
                  _buildFilterChip('all', 'Tümü ($total)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('success', '🟢 Başarılı ($successCount)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('error', '🔴 Hatalı ($errorCount)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('inactive', '⚪ Pasif'),
                ],
              ),
              const SizedBox(height: 16),

              // 3. Kaynak Listesi
              if (filtered.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(36),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                  child: Column(
                    children: [
                      const Icon(Icons.inbox_rounded, size: 40, color: Colors.grey),
                      const SizedBox(height: 12),
                      const Text('Bu filtreye uygun kaynak bulunamadı.', style: TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _seedFromCatalog,
                        icon: const Icon(Icons.sync_rounded, size: 16),
                        label: const Text('Katalogdaki 7 Kaynağı Eşitle'),
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final source = filtered[index];
                    return _buildSourceCard(source);
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppConstants.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppConstants.textSecondary)),
              Icon(icon, size: 18, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color.shade700)),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String id, String label) {
    final isSelected = _filterStatus == id;
    return FilterChip(
      selected: isSelected,
      label: Text(label, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500, color: isSelected ? Colors.white : AppConstants.textPrimary)),
      backgroundColor: Colors.white,
      selectedColor: AppConstants.primary,
      checkmarkColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: isSelected ? AppConstants.primary : AppConstants.border)),
      onSelected: (_) => setState(() => _filterStatus = id),
    );
  }

  Widget _buildSourceCard(SourceHealth source) {
    final isTesting = _testingIds.contains(source.id);
    final isSuccess = source.lastStatus == 'success';
    final isError = source.lastStatus == 'error';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isError ? Colors.red.shade200 : AppConstants.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Durum İkonu
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isSuccess
                      ? Colors.green.shade50
                      : isError
                          ? Colors.red.shade50
                          : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isSuccess
                      ? Icons.check_circle_rounded
                      : isError
                          ? Icons.error_outline_rounded
                          : Icons.hourglass_empty_rounded,
                  color: isSuccess
                      ? Colors.green
                      : isError
                          ? Colors.red
                          : Colors.grey,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),

              // Başlık & Link
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      source.title,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    InkWell(
                      onTap: () => launchUrl(Uri.parse(source.url), mode: LaunchMode.externalApplication),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              source.url,
                              style: const TextStyle(fontSize: 11, color: AppConstants.primary, decoration: TextDecoration.underline),
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

              // Durum Rozeti
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isSuccess
                      ? Colors.green.shade50
                      : isError
                          ? Colors.red.shade50
                          : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSuccess
                        ? Colors.green.shade200
                        : isError
                            ? Colors.red.shade200
                            : Colors.grey.shade300,
                  ),
                ),
                child: Text(
                  isSuccess
                      ? '200 OK'
                      : isError
                          ? 'HTTP ${source.httpStatus ?? "HATA"}'
                          : 'BEKLEMEDE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isSuccess
                        ? Colors.green.shade700
                        : isError
                            ? Colors.red.shade700
                            : Colors.grey.shade600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // Alt Detay Satırı
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.access_time_rounded, size: 14, color: AppConstants.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    source.lastCheckedAt != null
                        ? 'Son Kontrol: ${_formatDate(source.lastCheckedAt!)}'
                        : 'Henüz taranmadı',
                    style: const TextStyle(fontSize: 11, color: AppConstants.textSecondary),
                  ),
                  if (source.latencyMs != null) ...[
                    const SizedBox(width: 10),
                    Text('(${source.latencyMs} ms)', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ],
              ),

              Row(
                children: [
                  // Aktif / Pasif Toggle
                  Transform.scale(
                    scale: 0.75,
                    child: Switch(
                      value: source.isActive,
                      activeThumbColor: AppConstants.primary,
                      onChanged: (val) => _firestoreService.toggleSourceActive(source.id, val),
                    ),
                  ),
                  // Test Et Butonu
                  SizedBox(
                    height: 32,
                    child: ElevatedButton.icon(
                      onPressed: isTesting ? null : () => _testSingleSource(source),
                      icon: isTesting
                          ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.bolt_rounded, size: 14),
                      label: Text(isTesting ? 'Taranıyor...' : 'Test Et', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.grey),
                    onPressed: () => _firestoreService.deleteSource(source.id),
                    tooltip: 'Kaynağı Sil',
                  ),
                ],
              ),
            ],
          ),

          // Hata Mesajı Bölümü (Varsa)
          if (isError && source.lastError != null) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade100),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded, size: 16, color: Colors.red.shade700),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Hata Detayı: ${source.lastError}',
                      style: TextStyle(fontSize: 11, color: Colors.red.shade800, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLogsTab() {
    return StreamBuilder<List<ScanLog>>(
      stream: _firestoreService.getScanLogsStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final logs = snapshot.data ?? [];
        if (logs.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history_toggle_off_rounded, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 12),
                const Text('Henüz kaydedilmiş merkezi tarama günlüğü yok.', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                const Text('Merkezi tarayıcı her gün saat 19:00\'da çalıştıkça burada listelenecektir.', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(20),
          itemCount: logs.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final log = logs[index];
            final isSuccess = log.status == 'success';
            final isPartial = log.status == 'partial';

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
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isSuccess ? Colors.green.shade50 : (isPartial ? Colors.amber.shade50 : Colors.red.shade50),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isSuccess ? Icons.check_circle_rounded : (isPartial ? Icons.warning_rounded : Icons.error_rounded),
                      color: isSuccess ? Colors.green : (isPartial ? Colors.amber.shade800 : Colors.red),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          log.startedAt != null ? _formatDate(log.startedAt!) : 'Tarama Döngüsü',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Taranan: ${log.totalSources}  |  Başarılı: ${log.successCount}  |  Hatalı: ${log.errorCount}  |  Fırsat: ${log.changesDetected}',
                          style: const TextStyle(fontSize: 11, color: AppConstants.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isSuccess ? Colors.green.shade100 : (isPartial ? Colors.amber.shade100 : Colors.red.shade100),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      isSuccess ? 'BAŞARILI' : (isPartial ? 'KISMI HATA' : 'BAŞARISIZ'),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: isSuccess ? Colors.green.shade800 : (isPartial ? Colors.amber.shade900 : Colors.red.shade900),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildOpportunitiesAdminTab() {
    return StreamBuilder<List<Opportunity>>(
      stream: _firestoreService.getOpportunitiesStream(includeAll: true),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final allOpps = snapshot.data ?? [];
        final total = allOpps.length;
        final pendingCount = allOpps.where((o) => o.isPendingReview).length;
        final approvedCount = allOpps.where((o) => o.isApproved).length;
        final rejectedCount = allOpps.where((o) => o.isRejected).length;

        final filtered = allOpps.where((o) {
          if (_oppFilterStatus == 'pending_review') return o.isPendingReview;
          if (_oppFilterStatus == 'approved') return o.isApproved;
          if (_oppFilterStatus == 'rejected') return o.isRejected;
          return true;
        }).toList();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Metrik Kartları
              Row(
                children: [
                  Expanded(child: _buildMetricCard('Toplam Fırsat', '$total', Icons.event_note_rounded, Colors.blue)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Onay Bekleyen', '$pendingCount', Icons.hourglass_top_rounded, Colors.orange)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Yayında (Onaylı)', '$approvedCount', Icons.check_circle_rounded, Colors.green)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Reddedilen', '$rejectedCount', Icons.cancel_rounded, Colors.red)),
                ],
              ),
              const SizedBox(height: 20),

              // Filtre Çipleri
              Row(
                children: [
                  _buildOppFilterChip('all', 'Tümü ($total)'),
                  const SizedBox(width: 8),
                  _buildOppFilterChip('pending_review', '🟡 Bekleyenler ($pendingCount)'),
                  const SizedBox(width: 8),
                  _buildOppFilterChip('approved', '🟢 Onaylı ($approvedCount)'),
                  const SizedBox(width: 8),
                  _buildOppFilterChip('rejected', '🔴 Reddedilen ($rejectedCount)'),
                ],
              ),
              const SizedBox(height: 16),

              if (filtered.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(36),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                  child: const Column(
                    children: [
                      Icon(Icons.inbox_rounded, size: 40, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('Bu filtreye uygun etkinlik kaydı bulunamadı.', style: TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final opp = filtered[index];
                    return _buildAdminOppCard(opp);
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOppFilterChip(String id, String label) {
    final isSelected = _oppFilterStatus == id;
    return FilterChip(
      selected: isSelected,
      label: Text(label, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500, color: isSelected ? Colors.white : AppConstants.textPrimary)),
      backgroundColor: Colors.white,
      selectedColor: AppConstants.primary,
      checkmarkColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: isSelected ? AppConstants.primary : AppConstants.border)),
      onSelected: (_) => setState(() => _oppFilterStatus = id),
    );
  }

  Widget _buildAdminOppCard(Opportunity opp) {
    final isApproved = opp.isApproved;
    final isPending = opp.isPendingReview;
    final isRejected = opp.isRejected;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: opp.isUpdated ? Colors.amber.shade300 : (isPending ? Colors.orange.shade200 : AppConstants.border),
          width: opp.isUpdated || isPending ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            opp.sourceTitle,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppConstants.primary),
                          ),
                        ),
                        if (opp.isUpdated) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade50,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.amber.shade300),
                            ),
                            child: const Text('🔄 GÜNCELLENDİ', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.amber)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      opp.eventTitle ?? opp.sourceTitle,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isApproved ? Colors.green.shade50 : (isPending ? Colors.orange.shade50 : Colors.red.shade50),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isApproved ? Colors.green.shade200 : (isPending ? Colors.orange.shade200 : Colors.red.shade200),
                  ),
                ),
                child: Text(
                  isApproved ? 'ONAYLI' : (isPending ? 'ONAY BEKLİYOR' : 'REDDEDİLDİ'),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: isApproved ? Colors.green.shade800 : (isPending ? Colors.orange.shade800 : Colors.red.shade800),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (opp.eventStartDate != null && opp.eventStartDate!.isNotEmpty) ...[
            Text('🗓️ Tarih: ${_formatDate(opp.eventStartDate!)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
            const SizedBox(height: 4),
          ],
          Text(opp.summary, style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary, height: 1.4)),

          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 8),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (opp.calendarUrl != null && opp.calendarUrl!.isNotEmpty)
                TextButton.icon(
                  onPressed: () => launchUrl(Uri.parse(opp.calendarUrl!), mode: LaunchMode.externalApplication),
                  icon: const Icon(Icons.calendar_month_rounded, size: 14),
                  label: const Text('Takvim Linki', style: TextStyle(fontSize: 11)),
                ),
              const Spacer(),
              if (!isApproved)
                ElevatedButton.icon(
                  onPressed: () => _handleOppStatusChange(opp, 'approved'),
                  icon: const Icon(Icons.check_circle_rounded, size: 14),
                  label: const Text('Onayla & Yayınla', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    minimumSize: const Size(60, 32),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              if (!isRejected) ...[
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () => _handleOppStatusChange(opp, 'rejected'),
                  icon: const Icon(Icons.cancel_rounded, size: 14, color: Colors.red),
                  label: const Text('Reddet', style: TextStyle(fontSize: 11, color: Colors.red)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    minimumSize: const Size(60, 32),
                    side: BorderSide(color: Colors.red.shade200),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.edit_rounded, size: 18, color: Colors.blue),
                tooltip: 'Düzenle',
                onPressed: () => _openEditOppDialog(opp),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.grey),
                tooltip: 'Sil',
                onPressed: () => _handleOppDelete(opp),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _handleOppStatusChange(Opportunity opp, String status) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await _firestoreService.updateOpportunityStatus(opp.id, status);
      messenger.showSnackBar(
        SnackBar(
          content: Text(status == 'approved' ? '✅ "${opp.eventTitle ?? opp.sourceTitle}" yayına alındı!' : '🚫 Etkinlik reddedildi.'),
          backgroundColor: status == 'approved' ? Colors.green : Colors.grey.shade800,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _handleOppDelete(Opportunity opp) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Fırsatı Sil?'),
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

  Future<void> _openEditOppDialog(Opportunity opp) async {
    final titleCtrl = TextEditingController(text: opp.eventTitle ?? opp.sourceTitle);
    final dateCtrl = TextEditingController(text: opp.eventStartDate ?? '');
    final summaryCtrl = TextEditingController(text: opp.summary);
    final calUrlCtrl = TextEditingController(text: opp.calendarUrl ?? '');

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Fırsat & Takvim Detaylarını Düzenle', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Etkinlik Başlığı')),
              const SizedBox(height: 10),
              TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Tarih (ISO 8601)', hintText: '2026-10-25T18:00:00')),
              const SizedBox(height: 10),
              TextField(controller: summaryCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Yapay Zeka Özeti')),
              const SizedBox(height: 10),
              TextField(controller: calUrlCtrl, decoration: const InputDecoration(labelText: 'Google Takvim Bağlantısı')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Vazgeç')),
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
                messenger.showSnackBar(SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red));
              }
            },
            child: const Text('Kaydet & Onayla'),
          ),
        ],
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('dd.MM.yyyy HH:mm').format(dt);
    } catch (_) {
      return isoString;
    }
  }
}
