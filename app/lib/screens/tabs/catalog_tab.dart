import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/default_catalog.dart';
import '../../models/catalog_item.dart';
import '../../models/monitor.dart';
import '../../services/api_service.dart';
import '../../services/firestore_service.dart';
import '../../widgets/catalog_card.dart';
import '../company/company_detail_screen.dart';

class CatalogTab extends StatefulWidget {
  final List<Monitor> userMonitors;
  final Function(CatalogItem) onSubscribe;
  final String userId;
  final String? userEmail;

  const CatalogTab({
    super.key,
    required this.userMonitors,
    required this.onSubscribe,
    required this.userId,
    this.userEmail,
  });

  @override
  State<CatalogTab> createState() => _CatalogTabState();
}

class _CatalogTabState extends State<CatalogTab> {
  final ApiService _apiService = ApiService();
  final FirestoreService _firestoreService = FirestoreService();
  List<CatalogCategory> _categories = [];
  List<CatalogItem> _items = [];
  bool _isLoading = true;
  String _selectedCategory = 'all';

  @override
  void initState() {
    super.initState();
    _loadCatalog();
  }

  Future<void> _loadCatalog() async {
    // 1. Yerleşik varsayılan kataloğu anında yükle (0 gecikme)
    final fallback = DefaultCatalog.getCatalog(category: _selectedCategory);
    setState(() {
      _categories = fallback['categories'] ?? [];
      _items = fallback['items'] ?? [];
      _isLoading = false;
    });

    // 2. Yalnızca yerel API adresi tanımlıysa arka planda dene
    if (AppConstants.apiBaseUrl.isNotEmpty) {
      try {
        final res = await _apiService.getCatalog(category: _selectedCategory);
        if (mounted) {
          setState(() {
            _categories = res['categories'] ?? [];
            _items = res['items'] ?? [];
          });
        }
      } catch (_) {}
    }
  }

  void _openSuggestDialog() {
    final titleCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    String category = 'ceng';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Topluluk / Kampüs Öner', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Takip edilmesini istediğin bir üniversite sayfası veya etkinliği aday havuzuna öner.',
                style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Kanal Başlığı / Adı', hintText: 'Örn: İTÜ GDG'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: urlCtrl,
                decoration: const InputDecoration(labelText: 'Web Sayfası URL', hintText: 'https://...'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Vazgeç'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (urlCtrl.text.trim().isEmpty) return;
                final messenger = ScaffoldMessenger.of(context);
                final nav = Navigator.of(ctx);

                try {
                  await _firestoreService.suggestChannel(
                    title: titleCtrl.text.trim(),
                    url: urlCtrl.text.trim(),
                    category: category,
                    userEmail: widget.userEmail,
                  );
                } catch (e) {
                  debugPrint('Firestore öneri kaydetme hatası: $e');
                  try {
                    await _apiService.suggestChannel(
                      title: titleCtrl.text.trim(),
                      url: urlCtrl.text.trim(),
                      category: category,
                      suggestedBy: widget.userEmail,
                    );
                  } catch (_) {}
                }

                if (mounted) {
                  nav.pop();
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('Öneriniz aday havuzuna eklendi!'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              },
              child: const Text('Öner'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppConstants.primary, AppConstants.accentIndigo],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppConstants.primary.withValues(alpha: 0.2),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.explore_rounded, color: Colors.white, size: 14),
                      SizedBox(width: 6),
                      Text('Keşfet: Kurumlar & Topluluklar', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Şirketler & Üniversite Kulüpleri',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                const SizedBox(height: 6),
                Text(
                  'Takip etmek istediğin kurumları tek tıkla radarına ekle, etkinliklerini kaçırma.',
                  style: TextStyle(fontSize: 12, color: Colors.blue.shade100, height: 1.4),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _openSuggestDialog,
                  icon: const Icon(Icons.add_rounded, size: 16),
                  label: const Text('Kendi Okulunu / Topluluğunu Öner', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppConstants.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Kategori Filtreleri
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildCategoryChip('all', '✨ Tümü'),
                ..._categories.map((c) => _buildCategoryChip(c.id, '${c.icon} ${c.name}')),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Liste
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
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
                    mainAxisExtent: 220,
                  ),
                  itemCount: _items.length,
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    final bool isTracked = widget.userMonitors.any((m) => m.url == item.url);
                    return CatalogCard(
                      item: item,
                      isTracked: isTracked,
                      onSubscribe: () => widget.onSubscribe(item),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CompanyDetailScreen(
                              item: item,
                              userId: widget.userId,
                              userEmail: widget.userEmail ?? '',
                            ),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String id, String title) {
    final isSelected = _selectedCategory == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: isSelected,
        label: Text(title),
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
        onSelected: (selected) {
          setState(() => _selectedCategory = id);
          _loadCatalog();
        },
      ),
    );
  }
}
