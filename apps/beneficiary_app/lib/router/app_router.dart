import 'package:go_router/go_router.dart';

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
    ],
  );
}
