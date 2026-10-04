import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../models/monitor.dart';
import '../../models/opportunity.dart';
import '../../services/firestore_service.dart';
import '../../widgets/expandable_opportunity_card.dart';

class FollowingTab extends StatelessWidget {
  final String userId;
  final String userEmail;
  final bool isAdmin;
  final VoidCallback onNavigateToCatalog;

  const FollowingTab({
    super.key,
    required this.userId,
    required this.userEmail,
    this.isAdmin = false,
    required this.onNavigateToCatalog,
  });

  bool _isUpcomingOrActive(Opportunity opp) {
    if (opp.isCancelled) return false;
    if (opp.eventStartDate != null && opp.eventStartDate!.isNotEmpty) {
      try {
        final dt = DateTime.parse(opp.eventStartDate!);
        // Dünden önce bitmiş geçmiş etkinlikleri filtrele
        if (dt.isBefore(DateTime.now().subtract(const Duration(days: 1)))) {
          return false;
        }
      } catch (_) {}
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final firestoreService = FirestoreService();

    return StreamBuilder<List<Monitor>>(
      stream: firestoreService.getMonitorsStream(userId),
      builder: (context, monitorSnapshot) {
        if (monitorSnapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(40),
              child: CircularProgressIndicator(),
            ),
          );
        }

        final monitors = monitorSnapshot.data ?? [];

        // Kullanıcı hiç kurum takip etmiyorsa
        if (monitors.isEmpty) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildBanner(monitorsCount: 0),
                const SizedBox(height: 24),
                _buildNoMonitorsState(context),
              ],
            ),
          );
        }

        final followedUrls = monitors.map((m) => m.url.trim().toLowerCase()).toSet();
        final followedTitles = monitors.map((m) => m.title.trim().toLowerCase()).toList();

        return StreamBuilder<List<Opportunity>>(
          stream: firestoreService.streamOpportunities(onlyApproved: !isAdmin),
          builder: (context, oppSnapshot) {
            if (oppSnapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ),
              );
            }

            final allOpps = oppSnapshot.data ?? [];

            // Yalnızca takip edilen kurumlara ait ve aktif/gelecek etkinlikleri filtrele
            final followingOpps = allOpps.where((opp) {
              final oppUrl = opp.sourceUrl.trim().toLowerCase();
              final oppTitle = opp.sourceTitle.trim().toLowerCase();

              final matchesUrl = followedUrls.contains(oppUrl);
              final matchesTitle = followedTitles.any((t) =>
                  oppTitle.contains(t) || t.contains(oppTitle));

              if (!matchesUrl && !matchesTitle) return false;

              return _isUpcomingOrActive(opp);
            }).toList();

            // Tarihe göre sırala
            followingOpps.sort((a, b) {
              if (a.eventStartDate != null && b.eventStartDate != null) {
                return a.eventStartDate!.compareTo(b.eventStartDate!);
              }
              if (a.eventStartDate != null) return -1;
              if (b.eventStartDate != null) return 1;
              return (b.detectedAt ?? '').compareTo(a.detectedAt ?? '');
            });

            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBanner(monitorsCount: monitors.length),
                  const SizedBox(height: 20),

                  if (followingOpps.isEmpty)
                    _buildNoEventsState()
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: followingOpps.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (context, index) {
                        final opp = followingOpps[index];
                        return ExpandableOpportunityCard(
                          opportunity: opp,
                          isAdmin: isAdmin,
                          userId: userId,
                          userEmail: userEmail,
                        );
                      },
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildBanner({required int monitorsCount}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
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
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.bookmark_added_rounded, color: Colors.amber, size: 14),
                    SizedBox(width: 6),
                    Text(
                      'Kişisel Radar',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppConstants.primary.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppConstants.primary.withValues(alpha: 0.5)),
                ),
                child: Text(
                  '$monitorsCount Kurum Takipte',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Takip Ettiklerim (Etkinlikler)',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            'Yalnızca takip ettiğin şirket ve topluluklara ait aktif veya gelecekteki etkinlikler.',
            style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade200, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildNoMonitorsState(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(36),
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
              color: Colors.indigo.shade50,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.corporate_fare_rounded, size: 40, color: AppConstants.primary),
          ),
          const SizedBox(height: 16),
          const Text(
            'Henüz Bir Kurum Takip Etmiyorsun',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Keşfet sekmesinden teknoloji şirketleri, öğrenci kulüpleri ve organizatörleri tek tıkla radarına ekle.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, height: 1.5),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: onNavigateToCatalog,
            icon: const Icon(Icons.explore_rounded, size: 18),
            label: const Text('Kurumları Keşfet', style: TextStyle(fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoEventsState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(36),
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
              color: Colors.amber.shade50,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.event_busy_rounded, size: 40, color: Colors.amber),
          ),
          const SizedBox(height: 16),
          const Text(
            'Aktif Etkinlik Bulunmuyor',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Takip ettiğin kurumlara ait yeni bir etkinlik, hackathon veya başvuru tarihi yayınlandığında anında burada listelenecektir.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, height: 1.5),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: onNavigateToCatalog,
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('Daha Fazla Kurum Takip Et', style: TextStyle(fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppConstants.primary,
              side: const BorderSide(color: AppConstants.primary),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}
