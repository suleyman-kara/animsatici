import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/default_catalog.dart';
import '../models/catalog_item.dart';
import '../models/monitor.dart';
import '../models/notification_preferences.dart';
import '../models/opportunity.dart';
import '../models/scan_log.dart';
import '../models/source_health.dart';
import '../models/user_profile.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Kullanıcının kişisel monitörler koleksiyonu referansı
  CollectionReference<Map<String, dynamic>> _userMonitorsRef(String userId) {
    return _firestore.collection('users').doc(userId).collection('monitors');
  }

  // Gerçek zamanlı monitör akışı (Stream)
  Stream<List<Monitor>> getMonitorsStream(String userId) {
    return _userMonitorsRef(userId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return Monitor.fromJson(data);
      }).toList();
    });
  }

  // Tek seferlik monitör listesi çekme
  Future<List<Monitor>> getMonitors(String userId) async {
    final snapshot = await _userMonitorsRef(userId).get();
    return snapshot.docs.map((doc) {
      final data = doc.data();
      data['id'] = doc.id;
      return Monitor.fromJson(data);
    }).toList();
  }

  // Yeni monitör ekle
  Future<Monitor> addMonitor({
    required String userId,
    required String userEmail,
    required String title,
    required String url,
  }) async {
    final docRef = await _userMonitorsRef(userId).add({
      'title': title,
      'url': url,
      'userEmail': userEmail,
      'userId': userId,
      'lastSummary': null,
      'lastCheckedAt': DateTime.now().toIso8601String(),
      'isActive': true,
      'createdAt': FieldValue.serverTimestamp(),
    });

    return Monitor(
      id: docRef.id,
      title: title,
      url: url,
      userEmail: userEmail,
      userId: userId,
      isActive: true,
      lastCheckedAt: DateTime.now().toIso8601String(),
    );
  }

  // Monitör sil
  Future<void> deleteMonitor(String userId, String monitorId) async {
    await _userMonitorsRef(userId).doc(monitorId).delete();
  }

  // Şirket takip durumunu anında değiştir (Tek tıkla takip et / takipten çıkar)
  Future<bool> toggleFollowCompany({
    required String userId,
    required String userEmail,
    String? title,
    String? url,
    CatalogItem? item,
  }) async {
    final effectiveTitle = item?.title ?? title ?? '';
    final effectiveUrl = item?.url ?? url ?? '';
    final existing = await _userMonitorsRef(userId).where('url', isEqualTo: effectiveUrl).get();
    if (existing.docs.isNotEmpty) {
      for (final doc in existing.docs) {
        await doc.reference.delete();
      }
      return false; // Takipten çıkarıldı
    } else {
      await addMonitor(
        userId: userId,
        userEmail: userEmail,
        title: effectiveTitle,
        url: effectiveUrl,
      );
      return true; // Takip edildi
    }
  }

  // Monitör durumunu / özetini güncelle
  Future<void> updateMonitorSummary(String userId, String monitorId, String? summary) async {
    await _userMonitorsRef(userId).doc(monitorId).update({
      'lastSummary': summary,
      'lastCheckedAt': DateTime.now().toIso8601String(),
    });
  }

  // Topluluk aday havuzuna yeni kanal önerisi ekle
  Future<void> suggestChannel({
    required String title,
    required String url,
    required String category,
    String? userEmail,
  }) async {
    await _firestore.collection('candidatePool').add({
      'title': title,
      'url': url,
      'category': category,
      'suggestedBy': userEmail ?? 'anonymous',
      'votes': 1,
      'status': 'pending_review',
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  // --- KULLANICI BİLDİRİM TERCİHLERİ ---

  // Kullanıcının bildirim tercihlerini getir
  Future<NotificationPreferences> getUserPreferences(String userId, String defaultEmail) async {
    try {
      final doc = await _firestore.collection('users').doc(userId).get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!['preferences'] as Map<String, dynamic>?;
        return NotificationPreferences.fromMap(data, defaultEmail);
      }
    } catch (e) {
      // Hata durumunda varsayılan tercihler döner
    }
    return NotificationPreferences(notificationEmail: defaultEmail);
  }

  // Bildirim tercihlerini kaydet (Anında veya Günlük Bülten, Saat 19:00 vb.)
  Future<void> saveUserPreferences(String userId, NotificationPreferences prefs) async {
    await _firestore.collection('users').doc(userId).set({
      'preferences': prefs.toMap(),
      'lastUpdated': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  // --- KULLANICI PROFİLİ (ÜNİVERSİTE, BÖLÜM, SINIF, İLGİ ALANLARI) ---

  // Kullanıcı profilini getir
  Future<UserProfile> getUserProfile(String userId) async {
    try {
      final doc = await _firestore.collection('users').doc(userId).get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!['profile'] as Map<String, dynamic>?;
        return UserProfile.fromMap(data);
      }
    } catch (e) {
      // Hata durumunda varsayılan profil
    }
    return const UserProfile();
  }

  // Kullanıcı profilini kaydet
  Future<void> saveUserProfile(String userId, UserProfile profile) async {
    await _firestore.collection('users').doc(userId).set({
      'profile': profile.toMap(),
      'lastUpdated': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  // --- ŞİKAYET VE GERİ BİLDİRİM (REPORTS) ---

  // Şirket/Etkinlik için şikayet bildirimi gönder
  Future<void> submitReport({
    required String companyId,
    required String companyTitle,
    required String reportType,
    required String description,
    String? userEmail,
    String? userId,
  }) async {
    await _firestore.collection('reports').add({
      'companyId': companyId,
      'companyTitle': companyTitle,
      'reportType': reportType,
      'description': description,
      'reportedByEmail': userEmail ?? 'anonymous',
      'reportedByUid': userId ?? 'anonymous',
      'status': 'pending_investigation',
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  // --- MERKEZİ FIRSATLAR VE ETKİNLİKLER (OPPORTUNITIES) ---

  // Merkezi tarayıcının yakaladığı en güncel fırsatlar akışı
  Stream<List<Opportunity>> getOpportunitiesStream({bool includeAll = false}) {
    return _firestore
        .collection('opportunities')
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs.map((doc) => Opportunity.fromMap(doc.id, doc.data())).toList();
      if (includeAll) return list;
      // Normal kullanıcılar için yalnızca onaylı olanları (veya henüz eski dokümansa onaylı kabul edilenleri) göster
      return list.where((o) => o.status != 'rejected' && o.status != 'pending_review').toList();
    });
  }

  // streamOpportunities alias for convenience
  Stream<List<Opportunity>> streamOpportunities({bool onlyApproved = true}) {
    return getOpportunitiesStream(includeAll: !onlyApproved);
  }

  // Fırsat onay durumunu güncelle (Onayla / Reddet)
  Future<void> updateOpportunityStatus(String oppId, String newStatus) async {
    await _firestore.collection('opportunities').doc(oppId).update({
      'status': newStatus,
      'updatedAt': DateTime.now().toIso8601String(),
    });
  }

  // Fırsat verilerini doğrudan düzenle (Admin Edit)
  Future<void> updateOpportunityData(String oppId, Map<String, dynamic> data) async {
    data['updatedAt'] = DateTime.now().toIso8601String();
    await _firestore.collection('opportunities').doc(oppId).update(data);
  }

  // Fırsat kaydını sil
  Future<void> deleteOpportunity(String oppId) async {
    await _firestore.collection('opportunities').doc(oppId).delete();
  }

  // --- YÖNETİCİ PANELİ (ADMIN PANEL) FONKSİYONLARI ---

  // Merkezi kaynakları gerçek zamanlı akışla getir
  Stream<List<SourceHealth>> getSourcesStream() {
    return _firestore.collection('sources').snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => SourceHealth.fromMap(doc.id, doc.data())).toList();
    });
  }

  // Merkezi kaynakları tek seferlik getir
  Future<List<SourceHealth>> getSources() async {
    final snapshot = await _firestore.collection('sources').get();
    return snapshot.docs.map((doc) => SourceHealth.fromMap(doc.id, doc.data())).toList();
  }

  // Hazır kataloğu merkezi sources havuzuna aktar / eşitle
  Future<void> seedSourcesFromCatalog() async {
    final batch = _firestore.batch();
    for (final item in DefaultCatalog.items) {
      final docRef = _firestore.collection('sources').doc(item.id);
      batch.set(docRef, {
        'title': item.title,
        'url': item.url,
        'category': item.category,
        'isActive': true,
        'lastStatus': 'pending',
        'httpStatus': null,
        'lastError': null,
        'lastCheckedAt': null,
        'createdAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    }
    await batch.commit();
  }

  // Kaynağın aktif/pasif durumunu değiştir
  Future<void> toggleSourceActive(String sourceId, bool isActive) async {
    await _firestore.collection('sources').doc(sourceId).update({
      'isActive': isActive,
    });
  }

  // Yeni merkezi kaynak ekle
  Future<void> addSource({
    required String title,
    required String url,
    required String category,
  }) async {
    await _firestore.collection('sources').add({
      'title': title,
      'url': url,
      'category': category,
      'isActive': true,
      'lastStatus': 'pending',
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  // Kaynak sil
  Future<void> deleteSource(String sourceId) async {
    await _firestore.collection('sources').doc(sourceId).delete();
  }

  // Tarama geçmişi günlükleri akışı (Son 20 tarama)
  Stream<List<ScanLog>> getScanLogsStream() {
    return _firestore
        .collection('scan_logs')
        .orderBy('createdAt', descending: true)
        .limit(20)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => ScanLog.fromMap(doc.id, doc.data())).toList();
    });
  }
}
