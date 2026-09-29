import 'package:beneficiary_app/app/app.dart';
import 'package:beneficiary_app/core/preferences/app_settings.dart';
import 'package:beneficiary_app/core/preferences/app_settings_scope.dart';
import 'package:beneficiary_app/core/widgets/app_logo.dart';
import 'package:beneficiary_app/features/language_selection/presentation/language_selection_screen.dart';
import 'package:beneficiary_app/features/settings/presentation/settings_screen.dart';
import 'package:beneficiary_app/features/splash/presentation/splash_screen.dart';
import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _buildTestApp({
  required Widget child,
  AppSettings? settings,
}) {
  final appSettings = settings ?? AppSettings();
  return AppSettingsScope(
    settings: appSettings,
    child: ListenableBuilder(
      listenable: appSettings,
      builder: (context, _) {
        return MaterialApp(
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: appSettings.themeMode,
          locale: appSettings.locale,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: child,
        );
      },
    ),
  );
}

void main() {
  testWidgets('App smoke test loads successfully', (WidgetTester tester) async {
    final settings = AppSettings();
    await tester.pumpWidget(KaushalSaathiApp(settings: settings));
    expect(find.byType(KaushalSaathiApp), findsOneWidget);
  });

  testWidgets('App supports all 5 locales without errors', (WidgetTester tester) async {
    final locales = [
      const Locale('en'),
      const Locale('hi'),
      const Locale('bn'),
      const Locale('sat'),
      const Locale('unr'),
    ];

    for (final locale in locales) {
      final settings = AppSettings(locale: locale);
      await tester.pumpWidget(KaushalSaathiApp(settings: settings));
      expect(find.byType(KaushalSaathiApp), findsOneWidget);
      await tester.pump();
    }
  });

  testWidgets('App supports dark mode and light mode switching', (WidgetTester tester) async {
    final settings = AppSettings(themeMode: ThemeMode.dark);
    await tester.pumpWidget(KaushalSaathiApp(settings: settings));
    expect(settings.isDarkMode, isTrue);

    settings.setThemeMode(ThemeMode.light);
    await tester.pump();
    expect(settings.isDarkMode, isFalse);
  });

  testWidgets('SplashScreen contains 3 slides and transitions correctly', (WidgetTester tester) async {
    await tester.pumpWidget(_buildTestApp(child: const SplashScreen()));
    await tester.pumpAndSettle();

    // Verify first slide title & next button
    expect(find.text('Discover Livelihood & Skills'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);

    // Tap Next to move to slide 2
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('Voice Assistant in Your Language'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);

    // Tap Next to move to slide 3
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('Direct Opportunities & Growth'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);
  });

  testWidgets('LanguageSelectionScreen updates content dynamically on tap', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final settings = AppSettings(locale: const Locale('en'));
    await tester.pumpWidget(_buildTestApp(
      settings: settings,
      child: const LanguageSelectionScreen(),
    ));
    await tester.pumpAndSettle();

    // Initially English
    expect(find.text('Choose your language'), findsOneWidget);

    // Tap Hindi option
    await tester.tap(find.text('हिन्दी'));
    await tester.pumpAndSettle();

    // Content immediately updates to Hindi
    expect(find.text('अपनी भाषा चुनें'), findsOneWidget);
    expect(find.text('जारी रखें'), findsOneWidget);

    // Tap Bengali option
    await tester.tap(find.text('বাংলা'));
    await tester.pumpAndSettle();

    // Content immediately updates to Bengali
    expect(find.text('আপনার ভাষা বেছে নিন'), findsOneWidget);
    expect(find.text('চালিয়ে যান'), findsOneWidget);

    // Tap Santhali option
    await tester.ensureVisible(find.text('ᱥᱟᱱᱛᱟᱲᱤ'));
    await tester.tap(find.text('ᱥᱟᱱᱛᱟᱲᱤ'));
    await tester.pumpAndSettle();

    // Content immediately updates to Santhali
    expect(find.text('ᱟᱢᱟᱜ ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ'), findsOneWidget);
    expect(find.text('ᱞᱟᱦᱟ ᱥᱮᱱ'), findsOneWidget);

    // Tap Mundari option
    await tester.ensureVisible(find.text('ᱢᱩᱱᱰᱟᱹᱨᱤ'));
    await tester.tap(find.text('ᱢᱩᱱᱰᱟᱹᱨᱤ'));
    await tester.pumpAndSettle();

    // Content immediately updates to Mundari
    expect(find.text('ᱟᱢᱟᱜ ᱢᱩᱱᱰᱟᱹᱨᱤ ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ'), findsOneWidget);
    expect(find.text('ᱞᱟᱦᱟ ᱥᱮᱱ'), findsOneWidget);
  });

  testWidgets('SettingsScreen switches dark mode and language correctly', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final settings = AppSettings(
      themeMode: ThemeMode.light,
      locale: const Locale('en'),
    );

    await tester.pumpWidget(_buildTestApp(
      settings: settings,
      child: const SettingsScreen(),
    ));
    await tester.pumpAndSettle();

    // Verify dark mode toggle
    expect(settings.isDarkMode, isFalse);
    final switchFinder = find.byType(Switch);
    expect(switchFinder, findsNWidgets(3)); // Dark mode, Notifications, Voice responses

    await tester.tap(switchFinder.first);
    await tester.pumpAndSettle();
    expect(settings.isDarkMode, isTrue);

    // Tap Language tile to open bottom sheet
    await tester.tap(find.text('Language'));
    await tester.pumpAndSettle();

    // Pick Hindi from bottom sheet
    await tester.tap(find.text('हिन्दी'));
    await tester.pumpAndSettle();

    // App language updated to Hindi
    expect(settings.locale.languageCode, 'hi');
    expect(find.text('सेटिंग्स'), findsOneWidget);
    expect(find.text('डार्क मोड'), findsOneWidget);
  });

  testWidgets('Language picker in Settings does not overflow on small screens', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1100);
    tester.view.devicePixelRatio = 2.0; // Logical size: 400 x 550
    addTearDown(() => tester.view.resetPhysicalSize());

    final settings = AppSettings();
    await tester.pumpWidget(_buildTestApp(
      settings: settings,
      child: const SettingsScreen(),
    ));
    await tester.pumpAndSettle();

    // Tap Language to open modal sheet on a constrained 550px height screen
    await tester.tap(find.text('Language'));
    await tester.pumpAndSettle();

    expect(find.text('Choose your language'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('AppLogo widget renders with BoxFit.cover and ClipRRect', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AppLogo(size: 48),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(AppLogo), findsOneWidget);
    expect(find.byType(ClipRRect), findsOneWidget);
    expect(find.byType(Image), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('AppLogo is displayed on SplashScreen and LanguageSelectionScreen', (WidgetTester tester) async {
    // Check SplashScreen
    await tester.pumpWidget(_buildTestApp(child: const SplashScreen()));
    await tester.pumpAndSettle();
    expect(find.byType(AppLogo), findsOneWidget);

    // Check LanguageSelectionScreen
    await tester.pumpWidget(_buildTestApp(child: const LanguageSelectionScreen()));
    await tester.pumpAndSettle();
    expect(find.byType(AppLogo), findsOneWidget);
  });
}

