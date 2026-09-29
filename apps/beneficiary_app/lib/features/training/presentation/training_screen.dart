import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({super.key});

  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen> {
  int _selectedCategory = 0;

  List<TrainingOpportunity> _getOpportunities(AppLocalizations? l10n) {
    return [
      TrainingOpportunity(
        title: l10n?.tailoringStitching ?? 'Tailoring & Stitching',
        category: 'Services',
        categoryKey: 'services',
        description:
            'Learn basic tailoring, stitching and garment-making skills under PM-AJAY.',
        icon: Icons.content_cut_rounded,
        duration: '3 months',
        type: l10n?.skillTraining ?? 'Skill Training',
      ),
      TrainingOpportunity(
        title: l10n?.modernFarming ?? 'Modern Farming',
        category: 'Farming',
        categoryKey: 'farming',
        description:
            'Learn modern farming techniques, organic practices, and ways to improve income.',
        icon: Icons.agriculture_rounded,
        duration: '2 months',
        type: l10n?.skillTraining ?? 'Skill Training',
      ),
      TrainingOpportunity(
        title: l10n?.mobileRepair ?? 'Mobile Repair',
        category: 'Technical',
        categoryKey: 'technical',
        description: 'Learn smartphone repair and basic electronic servicing.',
        icon: Icons.phone_android_rounded,
        duration: '4 months',
        type: l10n?.skillTraining ?? 'Skill Training',
      ),
      TrainingOpportunity(
        title: l10n?.smallBusinessBasics ?? 'Small Business Basics',
        category: 'Business',
        categoryKey: 'business',
        description: 'Learn how to start and manage a small local business with loan assistance.',
        icon: Icons.storefront_rounded,
        duration: '1 month',
        type: l10n?.enterpriseOpportunities ?? 'Enterprise',
      ),
      TrainingOpportunity(
        title: l10n?.electricianTraining ?? 'Electrician Training',
        category: 'Technical',
        categoryKey: 'technical',
        description:
            'Build practical skills for electrical installation, domestic wiring, and repair.',
        icon: Icons.electrical_services_rounded,
        duration: '3 months',
        type: l10n?.skillTraining ?? 'Skill Training',
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    final categories = [
      {'key': 'all', 'label': l10n?.all ?? 'All'},
      {'key': 'farming', 'label': l10n?.farming ?? 'Farming'},
      {'key': 'business', 'label': l10n?.business ?? 'Business'},
      {'key': 'technical', 'label': l10n?.technical ?? 'Technical'},
      {'key': 'services', 'label': l10n?.services ?? 'Services'},
    ];

    final opportunities = _getOpportunities(l10n);
    final filteredOpportunities = _selectedCategory == 0
        ? opportunities
        : opportunities.where((opp) {
            final selectedKey = categories[_selectedCategory]['key'];
            return opp.categoryKey == selectedKey;
          }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n?.training ?? 'Training & Opportunities'),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildIntro(context, l10n),

                  const SizedBox(height: 24),

                  _buildRecommendedCard(context, l10n),

                  const SizedBox(height: 28),

                  _buildSectionTitle(
                    context,
                    l10n?.exploreByCategory ?? 'Explore by category',
                  ),

                  const SizedBox(height: 12),

                  _buildCategories(context, categories),

                  const SizedBox(height: 28),

                  _buildSectionTitle(
                    context,
                    l10n?.availableOpportunities ?? 'Available opportunities',
                  ),

                  const SizedBox(height: 14),

                  ...filteredOpportunities.map((opportunity) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _OpportunityCard(
                        opportunity: opportunity,
                        onTap: () {
                          _showOpportunityDetails(context, opportunity, l10n);
                        },
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),

          _buildBottomNavigation(context, l10n),
        ],
      ),
    );
  }

  Widget _buildIntro(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n?.findRightOpportunity ?? 'Find the right opportunity',
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          l10n?.exploreTrainingDescription ??
              'Explore training and livelihood options that can help you build useful skills and earn a better income.',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendedCard(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? primaryColor.withValues(alpha: 0.12)
            : primaryColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: primaryColor.withValues(alpha: 0.20),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: primaryColor,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              Icons.auto_awesome_rounded,
              color: isDark ? Colors.black : Colors.white,
              size: 27,
            ),
          ),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n?.getPersonalisedSuggestions ??
                      'Get personalised suggestions',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  l10n?.talkToSaathiSuggestions ??
                      'Talk to Saathi to discover opportunities based on your interests and skills.',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
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

  Widget _buildCategories(
    BuildContext context,
    List<Map<String, String>> categories,
  ) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final selected = _selectedCategory == index;

          return ChoiceChip(
            label: Text(categories[index]['label']!),
            selected: selected,
            onSelected: (_) {
              setState(() {
                _selectedCategory = index;
              });
            },
            selectedColor: primaryColor,
            labelStyle: TextStyle(
              color: selected
                  ? (isDark ? Colors.black : Colors.white)
                  : theme.colorScheme.onSurface,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            ),
          );
        },
      ),
    );
  }

  void _showOpportunityDetails(
    BuildContext context,
    TrainingOpportunity opportunity,
    AppLocalizations? l10n,
  ) {
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
              maxHeight: MediaQuery.sizeOf(bottomSheetContext).height * 0.85,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      opportunity.icon,
                      color: primaryColor,
                      size: 27,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      opportunity.title,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              Text(
                opportunity.description,
                style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
              ),

              const SizedBox(height: 20),

              Row(
                children: [
                  _InfoItem(
                    icon: Icons.schedule_rounded,
                    label: opportunity.duration,
                  ),
                  const SizedBox(width: 20),
                  _InfoItem(
                    icon: Icons.category_outlined,
                    label: opportunity.type,
                  ),
                ],
              ),

              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                  },
                  child: Text(l10n?.viewDetails ?? 'View details'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  },
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
                  icon: Icons.school_rounded,
                  label: l10n?.training ?? 'Training',
                  selected: true,
                  onTap: () {},
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

class _OpportunityCard extends StatelessWidget {
  final TrainingOpportunity opportunity;
  final VoidCallback onTap;

  const _OpportunityCard({required this.opportunity, required this.onTap});

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
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(
                  opportunity.icon,
                  color: primaryColor,
                  size: 27,
                ),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      opportunity.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      opportunity.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.schedule_rounded,
                          size: 14,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          opportunity.duration,
                          style: TextStyle(
                            fontSize: 12,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              const Icon(Icons.arrow_forward_ios_rounded, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: primaryColor),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ],
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

class TrainingOpportunity {
  final String title;
  final String category;
  final String categoryKey;
  final String description;
  final IconData icon;
  final String duration;
  final String type;

  const TrainingOpportunity({
    required this.title,
    required this.category,
    required this.categoryKey,
    required this.description,
    required this.icon,
    required this.duration,
    required this.type,
  });
}
