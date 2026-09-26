import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _darkMode = false;
  bool _notifications = true;
  bool _voiceResponses = true;

  String _selectedLanguage = 'English';

  final List<String> _languages = [
    'English',
    'हिन्दी',
    'বাংলা',
    'ᱥᱟᱱᱛᱟᱲᱤ',
    'Mundari',
  ];

  void _showLanguagePicker() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Choose your language',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'You can change this anytime.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                ..._languages.map((language) {
                  final isSelected = language == _selectedLanguage;

                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      isSelected
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                      color: isSelected
                          ? AppColors.primary
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    title: Text(
                      language,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    onTap: () {
                      setState(() {
                        _selectedLanguage = language;
                      });

                      Navigator.pop(context);
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showAboutDialog() {
    showAboutDialog(
      context: context,
      applicationName: 'Kaushal Saathi',
      applicationVersion: '1.0.0',
      applicationIcon: const Icon(
        Icons.handshake_rounded,
        color: AppColors.primary,
        size: 42,
      ),
      children: const [
        Text(
          'Kaushal Saathi helps you discover suitable skills, '
          'training and livelihood opportunities based on your '
          'interests and local opportunities.',
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          _buildSectionTitle(context, 'Preferences'),
          const SizedBox(height: 8),

          _buildSettingsCard(
            context,
            children: [
              ListTile(
                leading: const Icon(Icons.language_rounded),
                title: const Text(
                  'Language',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(_selectedLanguage),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: _showLanguagePicker,
              ),

              const Divider(height: 1),

              SwitchListTile(
                secondary: const Icon(Icons.dark_mode_outlined),
                title: const Text(
                  'Dark mode',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text('Use a darker appearance'),
                value: _darkMode,
                activeTrackColor: AppColors.primary,
                onChanged: (value) {
                  setState(() {
                    _darkMode = value;
                  });
                },
              ),

              const Divider(height: 1),

              SwitchListTile(
                secondary: const Icon(Icons.notifications_none_rounded),
                title: const Text(
                  'Notifications',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text(
                  'Get updates about training and opportunities',
                ),
                value: _notifications,
                activeTrackColor: AppColors.primary,
                onChanged: (value) {
                  setState(() {
                    _notifications = value;
                  });
                },
              ),
            ],
          ),

          const SizedBox(height: 28),

          _buildSectionTitle(context, 'Voice Assistant'),
          const SizedBox(height: 8),

          _buildSettingsCard(
            context,
            children: [
              SwitchListTile(
                secondary: const Icon(Icons.volume_up_outlined),
                title: const Text(
                  'Voice responses',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text('Let Saathi speak responses aloud'),
                value: _voiceResponses,
                activeTrackColor: AppColors.primary,
                onChanged: (value) {
                  setState(() {
                    _voiceResponses = value;
                  });
                },
              ),

              const Divider(height: 1),

              ListTile(
                leading: const Icon(Icons.record_voice_over_outlined),
                title: const Text(
                  'Voice language',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(_selectedLanguage),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: _showLanguagePicker,
              ),

              const Divider(height: 1),

              ListTile(
                leading: const Icon(Icons.speed_outlined),
                title: const Text(
                  'Voice speed',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text('Normal'),
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

          _buildSectionTitle(context, 'Information'),
          const SizedBox(height: 8),

          _buildSettingsCard(
            context,
            children: [
              ListTile(
                leading: const Icon(Icons.info_outline_rounded),
                title: const Text(
                  'About Kaushal Saathi',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text('Learn more about the application'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: _showAboutDialog,
              ),

              const Divider(height: 1),

              ListTile(
                leading: const Icon(Icons.help_outline_rounded),
                title: const Text(
                  'Help and support',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text('Get help using Kaushal Saathi'),
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
                leading: const Icon(Icons.privacy_tip_outlined),
                title: const Text(
                  'Privacy',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text('How your information is handled'),
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
              'Kaushal Saathi • Version 1.0.0',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        color: AppColors.primary,
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
