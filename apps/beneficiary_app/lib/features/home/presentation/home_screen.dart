import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(context, l10n),

                    const SizedBox(height: 24),

                    _buildAssistantCard(context, l10n),

                    const SizedBox(height: 28),

                    _buildSectionTitle(
                      context,
                      l10n?.whatAreYouLookingFor ?? 'What are you looking for?',
                    ),

                    const SizedBox(height: 14),

                    _buildQuickActions(context, l10n),

                    const SizedBox(height: 28),

                    _buildSectionTitle(
                      context,
                      l10n?.opportunitiesNearYou ?? 'Opportunities near you',
                    ),

                    const SizedBox(height: 14),

                    _buildOpportunityCard(
                      context,
                      icon: Icons.content_cut_rounded,
                      title: l10n?.tailoringStitching ?? 'Tailoring & Stitching',
                      subtitle: l10n?.skillTraining ?? 'Skill training',
                      onTap: () {
                        context.push('/training');
                      },
                    ),

                    const SizedBox(height: 12),

                    _buildOpportunityCard(
                      context,
                      icon: Icons.agriculture_rounded,
                      title: l10n?.modernFarming ?? 'Modern Farming',
                      subtitle: l10n?.trainingLivelihood ?? 'Training & livelihood',
                      onTap: () {
                        context.push('/training');
                      },
                    ),

                    const SizedBox(height: 12),

                    _buildOpportunityCard(
                      context,
                      icon: Icons.storefront_rounded,
                      title: l10n?.smallBusiness ?? 'Small Business',
                      subtitle:
                          l10n?.enterpriseOpportunities ?? 'Enterprise opportunities',
                      onTap: () {
                        context.push('/training');
                      },
                    ),

                    const SizedBox(height: 28),

                    _buildSectionTitle(
                      context,
                      l10n?.yourProgress ?? 'Your progress',
                    ),

                    const SizedBox(height: 14),

                    _buildProgressCard(context, l10n),
                  ],
                ),
              ),
            ),

            _buildBottomNavigation(context, l10n),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n?.namaste ?? 'Namaste!',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                l10n?.homeGreeting ?? 'How can we help you today?',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(width: 12),

        GestureDetector(
          onTap: () {
            context.push('/profile');
          },
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.person_outline_rounded,
              color: primaryColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAssistantCard(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mic_rounded,
                  color: Colors.white,
                  size: 28,
                ),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Text(
                  l10n?.talkToSaathi ?? 'Talk to Saathi',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          Text(
            l10n?.assistantDescription ??
                'Tell us what you are interested in. We can help you find suitable skills, training and livelihood opportunities.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.92),
              height: 1.5,
            ),
          ),

          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: () {
                context.push('/assistant');
              },
              icon: const Icon(Icons.mic_rounded),
              label: Text(l10n?.startTalking ?? 'Start talking'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primary,
                elevation: 0,
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
      style: Theme.of(
        context,
      ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
    );
  }

  Widget _buildQuickActions(BuildContext context, AppLocalizations? l10n) {
    return Row(
      children: [
        Expanded(
          child: _QuickActionCard(
            icon: Icons.school_outlined,
            title: l10n?.findTraining ?? 'Find training',
            onTap: () {
              context.push('/training');
            },
          ),
        ),

        const SizedBox(width: 12),

        Expanded(
          child: _QuickActionCard(
            icon: Icons.work_outline_rounded,
            title: l10n?.findWork ?? 'Find work',
            onTap: () {
              context.push('/training');
            },
          ),
        ),
      ],
    );
  }

  Widget _buildOpportunityCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
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
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: primaryColor, size: 26),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              const Icon(Icons.arrow_forward_ios_rounded, size: 17),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressCard(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 58,
            height: 58,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: 0.35,
                  strokeWidth: 6,
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                ),
                Text(
                  l10n?.progressPercentage ?? '35%',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),

          const SizedBox(width: 16),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n?.yourJourney ?? 'Your journey',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 5),
                Text(
                  l10n?.completeProfileRecommendation ??
                      'Complete your profile to get better recommendations.',
                  style: TextStyle(
                    fontSize: 14,
                    color: theme.colorScheme.onSurfaceVariant,
                    height: 1.4,
                  ),
                ),
              ],
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
                  icon: Icons.home_rounded,
                  label: l10n?.home ?? 'Home',
                  selected: true,
                  onTap: () {},
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
                  icon: Icons.person_outline_rounded,
                  label: l10n?.profile ?? 'Profile',
                  onTap: () {
                    context.push('/profile');
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.title,
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
          height: 100,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: theme.colorScheme.outlineVariant,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: primaryColor, size: 27),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
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
