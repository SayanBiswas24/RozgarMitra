import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n?.profile ?? 'My Profile'),
        actions: [
          IconButton(
            onPressed: () {
              context.push('/settings');
            },
            icon: const Icon(Icons.settings_outlined),
            tooltip: l10n?.settings ?? 'Settings',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                children: [
                  _buildProfileHeader(context, l10n),

                  const SizedBox(height: 28),

                  _buildSectionTitle(context, l10n?.aboutYou ?? 'About you'),

                  const SizedBox(height: 12),

                  _ProfileItem(
                    icon: Icons.school_outlined,
                    title: l10n?.education ?? 'Education',
                    value: l10n?.notAddedYet ?? 'Not added yet',
                    onTap: () {},
                  ),

                  _ProfileItem(
                    icon: Icons.work_outline_rounded,
                    title: l10n?.currentOccupation ?? 'Current occupation',
                    value: l10n?.notAddedYet ?? 'Not added yet',
                    onTap: () {},
                  ),

                  _ProfileItem(
                    icon: Icons.handyman_outlined,
                    title: l10n?.skills ?? 'Skills',
                    value: l10n?.addYourSkills ?? 'Add your skills',
                    onTap: () {},
                  ),

                  _ProfileItem(
                    icon: Icons.favorite_border_rounded,
                    title: l10n?.interests ?? 'Interests',
                    value: l10n?.tellUsWhatYouLike ?? 'Tell us what you like',
                    onTap: () {},
                  ),

                  _ProfileItem(
                    icon: Icons.location_on_outlined,
                    title: l10n?.location ?? 'Location',
                    value: l10n?.notAddedYet ?? 'Not added yet',
                    onTap: () {},
                  ),

                  const SizedBox(height: 28),

                  _buildSectionTitle(
                    context,
                    l10n?.workPreferences ?? 'Work preferences',
                  ),

                  const SizedBox(height: 12),

                  _PreferenceCard(
                    icon: Icons.business_center_outlined,
                    title: l10n?.whatKindOfWork ??
                        'What kind of work do you prefer?',
                    value: l10n?.notSelected ?? 'Not selected',
                    onTap: () {},
                  ),

                  const SizedBox(height: 12),

                  _PreferenceCard(
                    icon: Icons.directions_walk_outlined,
                    title: l10n?.howFarCanYouTravel ?? 'How far can you travel?',
                    value: l10n?.notSelected ?? 'Not selected',
                    onTap: () {},
                  ),

                  const SizedBox(height: 28),

                  _buildCompletionCard(context, l10n, primaryColor),
                ],
              ),
            ),
          ),

          _buildBottomNavigation(context, l10n),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Column(
      children: [
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            color: primaryColor.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.person_rounded,
            size: 48,
            color: primaryColor,
          ),
        ),

        const SizedBox(height: 14),

        Text(
          l10n?.profile ?? 'Your Profile',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),

        const SizedBox(height: 6),

        Text(
          l10n?.completeProfileRecommendation ??
              'Add some information about yourself to get better recommendations.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: Theme.of(
          context,
        ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildCompletionCard(
    BuildContext context,
    AppLocalizations? l10n,
    Color primaryColor,
  ) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: primaryColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: primaryColor.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline_rounded, color: primaryColor),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  l10n?.completeYourProfile ?? 'Complete your profile',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              Text(
                '20%',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: primaryColor,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: 0.20,
              minHeight: 8,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
            ),
          ),

          const SizedBox(height: 12),

          Text(
            l10n?.profileHelpText ??
                'A more complete profile will help Saathi suggest training and livelihood options that better match your needs.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 68,
          child: Row(
            children: [
              Expanded(
                child: _NavItem(
                  icon: Icons.home_outlined,
                  label: l10n?.home ?? 'Home',
                  onTap: () {
                    context.go('/home');
                  },
                ),
              ),
              Expanded(
                child: _NavItem(
                  icon: Icons.mic_none_rounded,
                  label: l10n?.assistant ?? 'Assistant',
                  onTap: () {
                    context.push('/assistant');
                  },
                ),
              ),
              Expanded(
                child: _NavItem(
                  icon: Icons.school_outlined,
                  label: l10n?.training ?? 'Training',
                  onTap: () {
                    context.push('/training');
                  },
                ),
              ),
              Expanded(
                child: _NavItem(
                  icon: Icons.person_rounded,
                  label: l10n?.profile ?? 'Profile',
                  selected: true,
                  onTap: () {},
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  const _ProfileItem({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Material(
      color: theme.colorScheme.surface,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: theme.colorScheme.outlineVariant,
              ),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: primaryColor, size: 23),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 13,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              Icon(
                Icons.chevron_right_rounded,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PreferenceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  const _PreferenceCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: theme.colorScheme.outlineVariant,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: primaryColor, size: 25),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 13,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    this.selected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 24,
            color: selected
                ? primaryColor
                : theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              color: selected
                  ? primaryColor
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
