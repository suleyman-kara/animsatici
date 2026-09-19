import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/monitor.dart';
import '../models/notification_preferences.dart';
import '../models/opportunity.dart';

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

  // --- MERKEZİ FIRSATLAR VE ETKİNLİKLER (OPPORTUNITIES) ---

  // Merkezi tarayıcının yakaladığı en güncel fırsatlar akışı
  Stream<List<Opportunity>> getOpportunitiesStream() {
    return _firestore
        .collection('opportunities')
        .orderBy('createdAt', descending: true)
        .limit(30)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return Opportunity.fromMap(doc.id, doc.data());
      }).toList();
    });
  }
}
