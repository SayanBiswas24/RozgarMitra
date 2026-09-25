import 'package:beneficiary_app/router/app_router.dart';
import 'package:beneficiary_app/theme/app_theme.dart';
import 'package:flutter/material.dart';

class KaushalSaathiApp extends StatelessWidget {
  const KaushalSaathiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Kaushal Saathi',

      debugShowCheckedModeBanner: false,

      theme: AppTheme.light,
      darkTheme: AppTheme.dark,

      themeMode: ThemeMode.light,

      routerConfig: AppRouter.router,
    );
  }
}
