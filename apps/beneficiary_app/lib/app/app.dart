import 'package:beneficiary_app/core/preferences/app_settings.dart';
import 'package:beneficiary_app/core/preferences/app_settings_scope.dart';
import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/router/app_router.dart';
import 'package:beneficiary_app/theme/app_theme.dart';
import 'package:flutter/material.dart';

class KaushalSaathiApp extends StatefulWidget {
  final AppSettings? settings;

  const KaushalSaathiApp({super.key, this.settings});

  @override
  State<KaushalSaathiApp> createState() => _KaushalSaathiAppState();
}

class _KaushalSaathiAppState extends State<KaushalSaathiApp> {
  late AppSettings _settings;

  @override
  void initState() {
    super.initState();
    _settings = widget.settings ?? AppSettings();
  }

  @override
  void didUpdateWidget(covariant KaushalSaathiApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.settings != null && widget.settings != _settings) {
      _settings = widget.settings!;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppSettingsScope(
      settings: _settings,
      child: ListenableBuilder(
        listenable: _settings,
        builder: (context, _) {
          return MaterialApp.router(
            title: 'Kaushal Saathi',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: _settings.themeMode,
            locale: _settings.locale,
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            localeResolutionCallback: (locale, supportedLocales) {
              if (locale != null) {
                for (final supported in supportedLocales) {
                  if (supported.languageCode == locale.languageCode) {
                    return supported;
                  }
                }
              }
              return supportedLocales.first;
            },
            routerConfig: AppRouter.router,
          );
        },
      ),
    );
  }
}
