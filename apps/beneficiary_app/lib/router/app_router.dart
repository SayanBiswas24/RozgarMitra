import 'package:beneficiary_app/features/assistant/presentation/assistant_screen.dart';
import 'package:beneficiary_app/features/profile/presentation/profile_screen.dart';
import 'package:beneficiary_app/features/settings/presentation/settings_screen.dart';
import 'package:beneficiary_app/features/training/presentation/training_screen.dart';
import 'package:go_router/go_router.dart';

import '../../features/home/presentation/home_screen.dart';
import '../../features/language_selection/presentation/language_selection_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';

class AppRouter {
  AppRouter._();

  static final GoRouter router = GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) {
          return const SplashScreen();
        },
      ),

      GoRoute(
        path: '/language',
        name: 'language',
        builder: (context, state) {
          return const LanguageSelectionScreen();
        },
      ),

      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) {
          return const HomeScreen();
        },
      ),

      GoRoute(
        path: '/assistant',
        name: 'assistant',
        builder: (context, state) {
          return const AssistantScreen();
        },
      ),

      GoRoute(
        path: '/training',
        name: 'training',
        builder: (context, state) {
          return const TrainingScreen();
        },
      ),

      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) {
          return const ProfileScreen();
        },
      ),

      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) {
          return const SettingsScreen();
        },
      ),
    ],
  );
}
