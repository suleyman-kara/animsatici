import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Anlık kullanıcı durumu dinleyicisi
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  // Google ile Giriş Yap
  Future<UserCredential?> signInWithGoogle() async {
    try {
      GoogleAuthProvider googleProvider = GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');

      if (kIsWeb) {
        return await _auth.signInWithPopup(googleProvider);
      } else {
        return await _auth.signInWithProvider(googleProvider);
      }
    } catch (e) {
      debugPrint('Google Sign-In Hatası: $e');
      rethrow;
    }
  }

  // Çıkış Yap
  Future<void> signOut() async {
    await _auth.signOut();
  }
}
