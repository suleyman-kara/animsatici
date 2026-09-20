import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/catalog_item.dart';
import '../models/monitor.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../widgets/add_monitor_dialog.dart';
import '../widgets/notification_preferences_dialog.dart';
import 'admin/admin_dashboard_screen.dart';
import 'tabs/catalog_tab.dart';
import 'tabs/monitors_tab.dart';

class HomeScreen extends StatefulWidget {
  final User user;

  const HomeScreen({super.key, required this.user});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AuthService _authService = AuthService();
  final FirestoreService _firestoreService = FirestoreService();

  bool get _isAdmin =>
      widget.user.email?.toLowerCase() == 'suleymankara600@gmail.com';

  int _currentIndex = 0;
  List<Monitor> _monitors = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMonitors();
  }

  Future<void> _loadMonitors() async {
    setState(() => _isLoading = true);
    try {
      // 1. Doğrudan Cloud Firestore'dan çek (7/24 Bulut Veritabanı)
      var firestoreList = await _firestoreService.getMonitors(widget.user.uid);
      
      // Kullanıcının henüz Firestore'da monitörü yoksa, daha önce takip ettiği
      // GDG DevFest ve inzva AI kamplarını Cloud Firestore'a otomatik aktar:
      if (firestoreList.isEmpty) {
        debugPrint('Firestore koleksiyonu boş, kayıtlı takipler Cloud Firestore\'a aktarılıyor...');
        try {
          final m1 = await _firestoreService.addMonitor(
            userId: widget.user.uid,
            userEmail: widget.user.email ?? '',
            title: 'GDG (Google Developer Groups) DevFest',
            url: 'https://gdg.community.dev',
          );
          final m2 = await _firestoreService.addMonitor(
            userId: widget.user.uid,
            userEmail: widget.user.email ?? '',
            title: 'inzva AI & Algoritma Kampları',
            url: 'https://inzva.com/events',
          );
          firestoreList = [m1, m2];
        } catch (seedErr) {
          debugPrint('Otomatik aktarma hatası: $seedErr');
        }
      }

      if (mounted) setState(() => _monitors = firestoreList);
    } catch (e) {
      debugPrint('Monitör yükleme hatası: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openAddModal({String? initialTitle, String? initialUrl}) {
    showDialog(
      context: context,
      builder: (ctx) => AddMonitorDialog(
        initialTitle: initialTitle,
        initialUrl: initialUrl,
        userEmail: widget.user.email ?? '',
        userId: widget.user.uid,
        onAdded: (newMonitor) {
          setState(() {
            _monitors.insert(0, newMonitor);
            _currentIndex = 0; // Takiplerim sekmesine dön
          });
        },
      ),
    );
  }

  void _handleSubscribeFromCatalog(CatalogItem item) {
    _openAddModal(initialTitle: item.title, initialUrl: item.url);
  }

  Future<void> _handleDelete(Monitor monitor) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Takibi Sil?'),
        content: Text('${monitor.title} takipten çıkarılsın mı?'),
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
      try {
        await _firestoreService.deleteMonitor(widget.user.uid, monitor.id);
      } catch (e) {
        debugPrint('Firestore silme hatası: $e');
      }
      _loadMonitors();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppConstants.primary, AppConstants.accentIndigo],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.radar_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppConstants.appName,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: AppConstants.textPrimary,
                  ),
                ),
                Text(
                  'CENG & Takvim Radarı',
                  style: TextStyle(fontSize: 10, color: AppConstants.textSecondary),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Yönetici Paneli Butonu (Yalnızca Admin)
          if (_isAdmin)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ActionChip(
                avatar: const Icon(Icons.admin_panel_settings_rounded, size: 16, color: Colors.amber),
                label: const Text('Yönetici Paneli', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppConstants.textPrimary)),
                backgroundColor: Colors.amber.shade50,
                side: BorderSide(color: Colors.amber.shade300),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AdminDashboardScreen()),
                  );
                },
              ),
            ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined, size: 22, color: AppConstants.textPrimary),
            tooltip: 'Bildirim Tercihlerim (Saat & Sıklık)',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => NotificationPreferencesDialog(
                  userId: widget.user.uid,
                  userEmail: widget.user.email ?? '',
                ),
              );
            },
          ),
          // Profil & Çıkış
          Padding(
            padding: const EdgeInsets.only(right: 12, left: 4),
            child: Row(
              children: [
                if (widget.user.photoURL != null)
                  CircleAvatar(
                    radius: 15,
                    backgroundImage: NetworkImage(widget.user.photoURL!),
                  )
                else
                  CircleAvatar(
                    radius: 15,
                    backgroundColor: AppConstants.primary,
                    child: Text(
                      (widget.user.displayName ?? widget.user.email ?? 'U').substring(0, 1).toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                const SizedBox(width: 4),
                IconButton(
                  icon: const Icon(Icons.logout_rounded, size: 20, color: Colors.grey),
                  tooltip: 'Çıkış Yap',
                  onPressed: () => _authService.signOut(),
                ),
              ],
            ),
          ),
        ],
      ),
      body: _currentIndex == 0
          ? MonitorsTab(
              monitors: _monitors,
              isLoading: _isLoading,
              userId: widget.user.uid,
              onRefresh: _loadMonitors,
              onDelete: _handleDelete,
              onSwitchToCatalog: () => setState(() => _currentIndex = 1),
            )
          : CatalogTab(
              userMonitors: _monitors,
              onSubscribe: _handleSubscribeFromCatalog,
              userEmail: widget.user.email,
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: Colors.white,
        elevation: 2,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.layers_outlined),
            selectedIcon: Icon(Icons.layers_rounded, color: AppConstants.primary),
            label: 'Takiplerim',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore_rounded, color: AppConstants.primary),
            label: 'Keşfet & Katalog',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddModal(),
        backgroundColor: AppConstants.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Özel Takip Ekle', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}
