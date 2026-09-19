import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/constants.dart';
import 'firebase_options.dart';
import 'screens/auth/landing_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase başlatma
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('Firebase başlatma uyarısı: $e');
  }

  runApp(const KampusRadarApp());
}

class KampusRadarApp extends StatelessWidget {
  const KampusRadarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppConstants.primary,
          primary: AppConstants.primary,
          surface: AppConstants.background,
        ),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(
          Theme.of(context).textTheme,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return StreamBuilder<User?>(
      stream: authService.authStateChanges,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            backgroundColor: AppConstants.background,
            body: Center(
              child: CircularProgressIndicator(color: AppConstants.primary),
            ),
          );
        }

        // Kullanıcı giriş yapmışsa kişisel Dashboard'a git
        if (snapshot.hasData && snapshot.data != null) {
          return HomeScreen(user: snapshot.data!);
        }

        // Giriş yapmamışsa Landing / Giriş ekranını göster
        return const LandingScreen();
      },
    );
  }
}
