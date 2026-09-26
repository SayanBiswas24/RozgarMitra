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

  final List<String> _categories = [
    'All',
    'Farming',
    'Business',
    'Technical',
    'Services',
  ];

  final List<TrainingOpportunity> _opportunities = [
    TrainingOpportunity(
      title: 'Tailoring & Stitching',
      category: 'Services',
      description:
          'Learn basic tailoring, stitching and garment-making skills.',
      icon: Icons.content_cut_rounded,
      duration: '3 months',
      type: 'Skill Training',
    ),
    TrainingOpportunity(
      title: 'Modern Farming',
      category: 'Farming',
      description:
          'Learn modern farming techniques and ways to improve income.',
      icon: Icons.agriculture_rounded,
      duration: '2 months',
      type: 'Skill Training',
    ),
    TrainingOpportunity(
      title: 'Mobile Repair',
      category: 'Technical',
      description: 'Learn smartphone repair and basic electronic servicing.',
      icon: Icons.phone_android_rounded,
      duration: '4 months',
      type: 'Skill Training',
    ),
    TrainingOpportunity(
      title: 'Small Business Basics',
      category: 'Business',
      description: 'Learn how to start and manage a small local business.',
      icon: Icons.storefront_rounded,
      duration: '1 month',
      type: 'Enterprise',
    ),
    TrainingOpportunity(
      title: 'Electrician Training',
      category: 'Technical',
      description:
          'Build practical skills for electrical installation and repair.',
      icon: Icons.electrical_services_rounded,
      duration: '3 months',
      type: 'Skill Training',
    ),
  ];

  List<TrainingOpportunity> get _filteredOpportunities {
    if (_selectedCategory == 0) {
      return _opportunities;
    }

    final category = _categories[_selectedCategory];

    return _opportunities
        .where((opportunity) => opportunity.category == category)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Training & Opportunities')),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildIntro(context),

                  const SizedBox(height: 24),

                  _buildRecommendedCard(context),

                  const SizedBox(height: 28),

                  _buildSectionTitle(context, 'Explore by category'),

                  const SizedBox(height: 12),

                  _buildCategories(context),

                  const SizedBox(height: 28),

                  _buildSectionTitle(context, 'Available opportunities'),

                  const SizedBox(height: 14),

                  ..._filteredOpportunities.map((opportunity) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _OpportunityCard(
                        opportunity: opportunity,
                        onTap: () {
                          _showOpportunityDetails(context, opportunity);
                        },
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),

          _buildBottomNavigation(context),
        ],
      ),
    );
  }

  Widget _buildIntro(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Find the right opportunity',
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          'Explore training and livelihood options '
          'that can help you build useful skills and '
          'earn a better income.',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendedCard(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: Colors.white,
              size: 27,
            ),
          ),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Get personalised suggestions',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 5),
                Text(
                  'Talk to Saathi to discover opportunities '
                  'based on your interests and skills.',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
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

  Widget _buildCategories(BuildContext context) {
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final selected = _selectedCategory == index;

          return ChoiceChip(
            label: Text(_categories[index]),
            selected: selected,
            onSelected: (_) {
              setState(() {
                _selectedCategory = index;
              });
            },
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: selected
                  ? Colors.white
                  : Theme.of(context).colorScheme.onSurface,
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
  ) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
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
                      color: AppColors.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      opportunity.icon,
                      color: AppColors.primary,
                      size: 27,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      opportunity.title,
                      style: const TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              Text(
                opportunity.description,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(height: 1.5),
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
                  child: const Text('View details'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBottomNavigation(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
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
                  label: 'Home',
                  onTap: () {
                    context.go('/home');
                  },
                ),
              ),
              Expanded(
                child: _NavItem(
                  icon: Icons.mic_none_rounded,
                  label: 'Assistant',
                  onTap: () {
                    context.push('/assistant');
                  },
                ),
              ),
              Expanded(
                child: _NavItem(
                  icon: Icons.school_rounded,
                  label: 'Training',
                  selected: true,
                  onTap: () {},
                ),
              ),
              Expanded(
                child: _NavItem(
                  icon: Icons.person_outline_rounded,
                  label: 'Profile',
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

class _OpportunityCard extends StatelessWidget {
  final TrainingOpportunity opportunity;
  final VoidCallback onTap;

  const _OpportunityCard({required this.opportunity, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(
                  opportunity.icon,
                  color: AppColors.primary,
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
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.schedule_rounded,
                          size: 14,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          opportunity.duration,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurfaceVariant,
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
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
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
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 24,
            color: selected
                ? AppColors.primary
                : Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              color: selected
                  ? AppColors.primary
                  : Theme.of(context).colorScheme.onSurfaceVariant,
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
  final String description;
  final IconData icon;
  final String duration;
  final String type;

  const TrainingOpportunity({
    required this.title,
    required this.category,
    required this.description,
    required this.icon,
    required this.duration,
    required this.type,
  });
}
