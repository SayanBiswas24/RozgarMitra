import 'package:beneficiary_app/core/preferences/app_settings_scope.dart';
import 'package:beneficiary_app/core/widgets/app_logo.dart';
import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class LanguageSelectionScreen extends StatefulWidget {
  const LanguageSelectionScreen({super.key});

  @override
  State<LanguageSelectionScreen> createState() =>
      _LanguageSelectionScreenState();
}

class _LanguageSelectionScreenState extends State<LanguageSelectionScreen> {
  int? _selectedLanguage;

  static const List<LanguageItem> _languages = [
    LanguageItem(name: 'English', nativeName: 'English', locale: Locale('en')),
    LanguageItem(name: 'Hindi', nativeName: 'हिन्दी', locale: Locale('hi')),
    LanguageItem(name: 'Bengali', nativeName: 'বাংলা', locale: Locale('bn')),
    LanguageItem(name: 'Santhali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', locale: Locale('sat')),
    LanguageItem(name: 'Mundari', nativeName: 'ᱢᱩᱱᱰᱟᱹᱨᱤ', locale: Locale('unr')),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_selectedLanguage == null) {
      final settings = AppSettingsScope.maybeOf(context);
      if (settings != null) {
        final currentCode = settings.locale.languageCode;
        final index = _languages.indexWhere((l) => l.locale.languageCode == currentCode);
        if (index != -1) {
          _selectedLanguage = index;
        }
      }
    }
  }

  void _selectLanguage(int index) {
    setState(() {
      _selectedLanguage = index;
    });
  }

  void _continue() {
    if (_selectedLanguage == null) {
      return;
    }

    final selectedLocale = _languages[_selectedLanguage!].locale;
    final settings = AppSettingsScope.of(context);
    settings.setLocale(selectedLocale);

    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Use translations for the currently highlighted/selected language
    final effectiveLocale = _selectedLanguage != null
        ? _languages[_selectedLanguage!].locale
        : (AppSettingsScope.maybeOf(context)?.locale ?? const Locale('en'));
    final l10n = lookupAppLocalizations(effectiveLocale);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Small app identity
                    Row(
                      children: [
                        const AppLogo(
                          size: 44,
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          l10n.appName,
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: isDark
                                ? AppColors.primaryLight
                                : AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 36),

                    // Heading in currently selected language
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      child: Align(
                        key: ValueKey('heading_${effectiveLocale.languageCode}'),
                        alignment: Alignment.centerLeft,
                        child: Text(
                          l10n.chooseLanguage,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Subtitle in currently selected language
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      child: Text(
                        l10n.chooseLanguageSubtitle,
                        key: ValueKey('sub_${effectiveLocale.languageCode}'),
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                    ),

                    const SizedBox(height: 28),

                    // Language options
                    ...List.generate(_languages.length, (index) {
                      final language = _languages[index];

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _LanguageCard(
                          language: language,
                          selected: _selectedLanguage == index,
                          onTap: () {
                            _selectLanguage(index);
                          },
                        ),
                      );
                    }),

                    const SizedBox(height: 10),

                    // Helper text in currently selected language
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark
                            ? theme.colorScheme.surface
                            : const Color(0xFFF3F6F2),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: theme.colorScheme.outlineVariant,
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.info_outline_rounded,
                            size: 20,
                            color: isDark
                                ? AppColors.primaryLight
                                : AppColors.primary,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 200),
                              child: Text(
                                l10n.assistantLanguageNotice,
                                key: ValueKey('info_${effectiveLocale.languageCode}'),
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Continue button in currently selected language
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _selectedLanguage == null ? null : _continue,
                  child: Text(l10n.continueText),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageCard extends StatelessWidget {
  final LanguageItem language;
  final bool selected;
  final VoidCallback onTap;

  const _LanguageCard({
    required this.language,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            color: selected
                ? (isDark
                    ? AppColors.primaryLight.withValues(alpha: 0.15)
                    : AppColors.primary.withValues(alpha: 0.08))
                : colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? primaryColor : colorScheme.outlineVariant,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: selected
                      ? primaryColor
                      : (isDark
                          ? AppColors.primaryLight.withValues(alpha: 0.12)
                          : AppColors.primary.withValues(alpha: 0.08)),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.language_rounded,
                  color: selected
                      ? (isDark ? Colors.black : Colors.white)
                      : primaryColor,
                  size: 23,
                ),
              ),

              const SizedBox(width: 16),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      language.nativeName,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: selected ? primaryColor : colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      language.name,
                      style: TextStyle(
                        fontSize: 14,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? primaryColor : Colors.transparent,
                  border: Border.all(
                    color: selected ? primaryColor : colorScheme.outline,
                    width: 2,
                  ),
                ),
                child: selected
                    ? Icon(
                        Icons.check,
                        size: 17,
                        color: isDark ? Colors.black : Colors.white,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class LanguageItem {
  final String name;
  final String nativeName;
  final Locale locale;

  const LanguageItem({
    required this.name,
    required this.nativeName,
    required this.locale,
  });
}
