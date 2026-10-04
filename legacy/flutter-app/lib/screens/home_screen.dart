import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/catalog_item.dart';
import '../models/monitor.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../widgets/notification_preferences_dialog.dart';
import '../widgets/profile_dialog.dart';
import 'admin/admin_dashboard_screen.dart';
import 'tabs/catalog_tab.dart';
import 'tabs/following_tab.dart';
import 'tabs/opportunities_tab.dart';

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
      var firestoreList = await _firestoreService.getMonitors(widget.user.uid);
      
      // İlk girişte varsayılan GDG ve inzva takipleri
      if (firestoreList.isEmpty) {
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

  Future<void> _handleToggleFollow(CatalogItem item) async {
    try {
      final isNowFollowing = await _firestoreService.toggleFollowCompany(
        userId: widget.user.uid,
        userEmail: widget.user.email ?? '',
        item: item,
      );
      await _loadMonitors();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  isNowFollowing ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                  color: Colors.white,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isNowFollowing
                        ? '${item.title} takibe alındı! Etkinlikleri radarına eklendi.'
                        : '${item.title} takipten çıkarıldı.',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 2),
            backgroundColor: isNowFollowing ? const Color(0xFF10B981) : Colors.grey.shade900,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('İşlem gerçekleştirilemedi: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _openProfileDialog() {
    showDialog(
      context: context,
      builder: (ctx) => ProfileDialog(
        userId: widget.user.uid,
        userEmail: widget.user.email ?? '',
        onProfileUpdated: () {
          setState(() {});
        },
      ),
    );
  }

  void _openNotificationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => NotificationPreferencesDialog(
        userId: widget.user.uid,
        userEmail: widget.user.email ?? '',
      ),
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0:
        return OpportunitiesTab(
          userId: widget.user.uid,
          userEmail: widget.user.email ?? '',
          isAdmin: _isAdmin,
        );
      case 1:
        return FollowingTab(
          userId: widget.user.uid,
          userEmail: widget.user.email ?? '',
          isAdmin: _isAdmin,
          onNavigateToCatalog: () => setState(() => _currentIndex = 2),
        );
      case 2:
      default:
        return CatalogTab(
          userMonitors: _monitors,
          onSubscribe: _handleToggleFollow,
          userId: widget.user.uid,
          userEmail: widget.user.email,
        );
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
                  'CENG & Etkinlik Radarı',
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

          // Bildirim Tercihleri (Sıklık, Mobil/Mail tercihi)
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, size: 22, color: AppConstants.textPrimary),
            tooltip: 'Bildirim Ayarları (Sıklık, E-posta & Mobil)',
            onPressed: _openNotificationDialog,
          ),

          // Öğrenci Profili (Üniversite, Bölüm, Sınıf, İlgi Alanları)
          IconButton(
            icon: const Icon(Icons.person_outline_rounded, size: 22, color: AppConstants.textPrimary),
            tooltip: 'Profilim & İlgi Alanlarım',
            onPressed: _openProfileDialog,
          ),

          // Çıkış Butonu
          Padding(
            padding: const EdgeInsets.only(right: 12, left: 2),
            child: IconButton(
              icon: const Icon(Icons.logout_rounded, size: 20, color: Colors.grey),
              tooltip: 'Çıkış Yap',
              onPressed: () => _authService.signOut(),
            ),
          ),
        ],
        bottom: _isLoading
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: _buildBody(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: Colors.white,
        elevation: 2,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome_rounded, color: AppConstants.primary),
            label: 'Fırsatlar Akışı',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_border_rounded),
            selectedIcon: Icon(Icons.bookmark_rounded, color: AppConstants.primary),
            label: 'Takip Ettiklerim',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore_rounded, color: AppConstants.primary),
            label: 'Keşfet',
          ),
        ],
      ),
    );
  }
}
