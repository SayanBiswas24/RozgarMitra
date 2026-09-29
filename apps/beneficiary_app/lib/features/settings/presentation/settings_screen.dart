import 'package:beneficiary_app/core/localization/app_languages.dart';
import 'package:beneficiary_app/core/preferences/app_settings_scope.dart';
import 'package:beneficiary_app/core/widgets/app_logo.dart';
import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  void _showLanguagePicker(BuildContext context) {
    final settings = AppSettingsScope.of(context);
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: theme.bottomSheetTheme.backgroundColor,
      builder: (bottomSheetContext) {
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(bottomSheetContext).height * 0.80,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n?.chooseLanguage ?? 'Choose your language',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n?.changeLanguageNotice ?? 'You can change this anytime.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...AppLanguages.supported.map((language) {
                    final isSelected =
                        language.locale.languageCode == settings.locale.languageCode;

                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                      leading: Icon(
                        isSelected
                            ? Icons.radio_button_checked
                            : Icons.radio_button_off,
                        color: isSelected
                            ? primaryColor
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                      title: Text(
                        language.nativeName,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: isSelected ? primaryColor : null,
                        ),
                      ),
                      subtitle: Text(
                        language.name,
                        style: TextStyle(
                          fontSize: 13,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      trailing: isSelected
                          ? Icon(Icons.check_rounded, color: primaryColor, size: 20)
                          : null,
                      onTap: () {
                        settings.setLocale(language.locale);
                        Navigator.pop(bottomSheetContext);
                      },
                    );
                  }),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showAboutDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    showAboutDialog(
      context: context,
      applicationName: l10n?.appName ?? 'Kaushal Saathi',
      applicationVersion: '1.0.0',
      applicationIcon: const AppLogo(
        size: 48,
        borderRadius: BorderRadius.all(Radius.circular(10)),
      ),
      children: [
        Text(
          l10n?.aboutDescription ??
              'Kaushal Saathi helps you discover suitable skills, training and livelihood opportunities based on your interests and local opportunities under PM-AJAY.',
          style: theme.textTheme.bodyMedium,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = AppSettingsScope.of(context);
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    final currentLang = settings.currentLanguage;

    return Scaffold(
      appBar: AppBar(title: Text(l10n?.settings ?? 'Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          _buildSectionTitle(context, l10n?.preferences ?? 'Preferences'),
          const SizedBox(height: 8),

          _buildSettingsCard(
            context,
            children: [
              ListTile(
                leading: Icon(Icons.language_rounded, color: primaryColor),
                title: Text(
                  l10n?.language ?? 'Language',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text('${currentLang.nativeName} (${currentLang.name})'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => _showLanguagePicker(context),
              ),

              const Divider(height: 1),

              SwitchListTile(
                secondary: Icon(
                  isDark ? Icons.dark_mode_rounded : Icons.dark_mode_outlined,
                  color: primaryColor,
                ),
                title: Text(
                  l10n?.darkMode ?? 'Dark mode',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  l10n?.useDarkAppearance ?? 'Use a darker appearance',
                ),
                value: settings.isDarkMode,
                activeTrackColor: primaryColor,
                onChanged: (value) {
                  settings.setThemeMode(
                    value ? ThemeMode.dark : ThemeMode.light,
                  );
                },
              ),

              const Divider(height: 1),

              SwitchListTile(
                secondary: Icon(
                  Icons.notifications_none_rounded,
                  color: primaryColor,
                ),
                title: Text(
                  l10n?.notifications ?? 'Notifications',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  l10n?.notificationsSubtitle ??
                      'Get updates about training and opportunities',
                ),
                value: settings.notificationsEnabled,
                activeTrackColor: primaryColor,
                onChanged: (value) {
                  settings.setNotifications(value);
                },
              ),
            ],
          ),

          const SizedBox(height: 28),

          _buildSectionTitle(context, l10n?.voiceAssistant ?? 'Voice Assistant'),
          const SizedBox(height: 8),

          _buildSettingsCard(
            context,
            children: [
              SwitchListTile(
                secondary: Icon(Icons.volume_up_outlined, color: primaryColor),
                title: Text(
                  l10n?.voiceResponses ?? 'Voice responses',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  l10n?.voiceResponsesSubtitle ??
                      'Let Saathi speak responses aloud',
                ),
                value: settings.voiceResponsesEnabled,
                activeTrackColor: primaryColor,
                onChanged: (value) {
                  settings.setVoiceResponses(value);
                },
              ),

              const Divider(height: 1),

              ListTile(
                leading: Icon(
                  Icons.record_voice_over_outlined,
                  color: primaryColor,
                ),
                title: Text(
                  l10n?.voiceLanguage ?? 'Voice language',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text('${currentLang.nativeName} (${currentLang.name})'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => _showLanguagePicker(context),
              ),

              const Divider(height: 1),

              ListTile(
                leading: Icon(Icons.speed_outlined, color: primaryColor),
                title: Text(
                  l10n?.voiceSpeed ?? 'Voice speed',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(l10n?.normal ?? 'Normal'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Voice speed settings will be available soon.',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),

          const SizedBox(height: 28),

          _buildSectionTitle(context, l10n?.information ?? 'Information'),
          const SizedBox(height: 8),

          _buildSettingsCard(
            context,
            children: [
              ListTile(
                leading: Icon(Icons.info_outline_rounded, color: primaryColor),
                title: Text(
                  l10n?.aboutKaushalSaathi ?? 'About Kaushal Saathi',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  l10n?.aboutSubtitle ?? 'Learn more about the application',
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => _showAboutDialog(context),
              ),

              const Divider(height: 1),

              ListTile(
                leading: Icon(Icons.help_outline_rounded, color: primaryColor),
                title: Text(
                  l10n?.helpSupport ?? 'Help and support',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  l10n?.helpSupportSubtitle ?? 'Get help using Kaushal Saathi',
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Help and support will be available soon.'),
                    ),
                  );
                },
              ),

              const Divider(height: 1),

              ListTile(
                leading: Icon(Icons.privacy_tip_outlined, color: primaryColor),
                title: Text(
                  l10n?.privacy ?? 'Privacy',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  l10n?.privacySubtitle ?? 'How your information is handled',
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Privacy information will be added later.'),
                    ),
                  );
                },
              ),
            ],
          ),

          const SizedBox(height: 32),

          Center(
            child: Text(
              l10n?.versionText ?? 'Kaushal Saathi • Version 1.0.0',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Text(
      title,
      style: theme.textTheme.titleMedium?.copyWith(
        color: isDark ? AppColors.primaryLight : AppColors.primary,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildSettingsCard(
    BuildContext context, {
    required List<Widget> children,
  }) {
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }
}
