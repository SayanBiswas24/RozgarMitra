import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../../training/presentation/training_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _completionPercentage = 0;
  bool _isLoggedIn = false;
  List<Map<String, dynamic>> _nearYouOpportunities = [];
  bool _isLoadingNearYou = true;
  String? _userLocationDistrict;

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  Future<void> _loadHomeData() async {
    final loggedIn = await ApiService.instance.isLoggedIn();
    int pct = 0;
    String? userDistrict;
    String? userState;
    double? userLat;
    double? userLon;

    if (loggedIn) {
      try {
        final progressData = await ApiService.instance.getProgress();
        pct = progressData['completionPercentage'] ?? 20;
      } catch (_) {}

      try {
        final profile = await ApiService.instance.getProfile();
        final rawLoc = profile['aboutYou']?['location'];
        if (rawLoc is Map) {
          userDistrict = rawLoc['district']?.toString();
          userState = rawLoc['state']?.toString();
          final coords = rawLoc['coordinates'];
          if (coords is Map) {
            if (coords['latitude'] != null) userLat = double.tryParse(coords['latitude'].toString());
            if (coords['longitude'] != null) userLon = double.tryParse(coords['longitude'].toString());
          }
        }
      } catch (_) {}
    }

    // Fetch real nearest opportunities matching user's address/district
    List<Map<String, dynamic>> opps = [];
    try {
      opps = await ApiService.instance.getNearYouOpportunities(
        district: userDistrict,
        state: userState,
        latitude: userLat,
        longitude: userLon,
        limit: 3,
      );
    } catch (_) {}

    if (mounted) {
      setState(() {
        _isLoggedIn = loggedIn;
        _completionPercentage = pct;
        _nearYouOpportunities = opps;
        _userLocationDistrict = userDistrict;
        _isLoadingNearYou = false;
      });
    }
  }

  Future<void> _openProfile() async {
    await context.push('/profile');
    _loadHomeData();
  }

  Future<void> _launchExternalUrl(String? urlString) async {
    if (urlString == null || urlString.trim().isEmpty) return;
    try {
      final uri = Uri.parse(urlString.trim());
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open link: $urlString')),
        );
      }
    }
  }

  void _showOpportunityDetails(Map<String, dynamic> opp) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (context) {
        return OpportunityDetailsSheet(
          opportunityId: opp['id']?.toString() ?? '',
          fallbackData: opp,
          onOpenUrl: _launchExternalUrl,
        );
      },
    );
  }

  IconData _getSectorIcon(String? sector) {
    if (sector == null) return Icons.school_rounded;
    final s = sector.toLowerCase();
    if (s.contains('it') || s.contains('software') || s.contains('computer')) return Icons.computer_rounded;
    if (s.contains('electronic')) return Icons.electrical_services_rounded;
    if (s.contains('media') || s.contains('entertainment') || s.contains('animation')) return Icons.movie_creation_outlined;
    if (s.contains('solar') || s.contains('renewable') || s.contains('energy')) return Icons.solar_power_rounded;
    if (s.contains('textile') || s.contains('tailor') || s.contains('handloom')) return Icons.content_cut_rounded;
    if (s.contains('health') || s.contains('medical') || s.contains('nurs')) return Icons.medical_services_outlined;
    if (s.contains('construct') || s.contains('plumb') || s.contains('weld')) return Icons.construction_rounded;
    if (s.contains('beauty') || s.contains('wellness')) return Icons.spa_outlined;
    if (s.contains('auto') || s.contains('driv')) return Icons.directions_car_outlined;
    if (s.contains('management') || s.contains('entrepreneur') || s.contains('business')) return Icons.business_center_outlined;
    if (s.contains('farm') || s.contains('agri')) return Icons.agriculture_rounded;
    return Icons.school_rounded;
  }

  @override
  Widget build(BuildContext context) {
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
                    _buildHeader(context),

                    const SizedBox(height: 24),

                    _buildAssistantCard(context),

                    const SizedBox(height: 28),

                    _buildSectionTitle(context, 'What are you looking for?'),

                    const SizedBox(height: 14),

                    _buildQuickActions(context),

                    const SizedBox(height: 28),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildSectionTitle(context, 'Opportunities near you'),
                            if (_userLocationDistrict != null && _userLocationDistrict!.trim().isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(Icons.location_on, size: 13, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Near $_userLocationDistrict',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                        TextButton(
                          onPressed: () => context.push('/training'),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(50, 30),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text('See all', style: TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    if (_isLoadingNearYou) ...[
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24.0),
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    ] else if (_nearYouOpportunities.isEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, color: Theme.of(context).colorScheme.onSurfaceVariant),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'Explore verified government courses and training programs.',
                                style: TextStyle(fontSize: 13),
                              ),
                            ),
                            TextButton(
                              onPressed: () => context.push('/training'),
                              child: const Text('Browse'),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      ..._nearYouOpportunities.map((opp) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildRealOpportunityCard(context, opp),
                        );
                      }),
                    ],

                    const SizedBox(height: 28),

                    _buildSectionTitle(context, 'Your progress'),

                    const SizedBox(height: 14),

                    _buildProgressCard(context),
                  ],
                ),
              ),
            ),

            _buildBottomNavigation(context),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Namaste!',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'How can we help you today?',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(width: 12),

        InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: _openProfile,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.10),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.person_outline_rounded,
              color: AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAssistantCard(BuildContext context) {
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
                  'Talk to Saathi',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          Text(
            'Tell us what you are interested in. '
            'We can help you find suitable skills, '
            'training and livelihood opportunities.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
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
              label: const Text('Start talking'),
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

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _QuickActionCard(
            icon: Icons.school_outlined,
            title: 'Find training',
            onTap: () {
              context.push('/training');
            },
          ),
        ),

        const SizedBox(width: 12),

        Expanded(
          child: _QuickActionCard(
            icon: Icons.work_outline_rounded,
            title: 'Find work',
            onTap: () {},
          ),
        ),
      ],
    );
  }

  Widget _buildRealOpportunityCard(
    BuildContext context,
    Map<String, dynamic> opp,
  ) {
    final title = opp['courseName']?.toString() ?? opp['title']?.toString() ?? 'Training Opportunity';
    final sector = opp['sector']?.toString() ?? opp['category']?.toString();
    final centerName = opp['centerName']?.toString() ?? opp['district']?.toString() ?? 'Official Training Center';
    final distanceKm = opp['distanceKm'];
    final freeForSc = opp['freeForSc']?.toString().toLowerCase() == 'yes';
    final icon = _getSectorIcon(sector);

    String subtitleText = centerName;
    if (distanceKm != null) {
      subtitleText = '$centerName • $distanceKm km away';
    }

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => _showOpportunityDetails(opp),
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
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary, size: 26),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitleText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (freeForSc) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '100% Free for SC',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.green.shade800,
                          ),
                        ),
                      ),
                    ],
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

  Widget _buildProgressCard(BuildContext context) {
    final pct = _isLoggedIn ? _completionPercentage : 0;
    final progressVal = pct / 100.0;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: _openProfile,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
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
                      value: progressVal,
                      strokeWidth: 6,
                      backgroundColor: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        AppColors.primary,
                      ),
                    ),
                    Text(
                      '$pct%',
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
                    const Text(
                      'Your journey',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      _isLoggedIn
                          ? 'Your profile is $pct% complete. Tap to complete remaining information.'
                          : 'Log in to track your profile progress and unlock personalized recommendations.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),

              const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
            ],
          ),
        ),
      ),
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
                  icon: Icons.home_rounded,
                  label: 'Home',
                  selected: true,
                  onTap: () {},
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
                  icon: Icons.school_outlined,
                  label: 'Training',
                  onTap: () {
                    context.push('/training');
                  },
                ),
              ),

              Expanded(
                child: _NavItem(
                  icon: Icons.person_outline_rounded,
                  label: 'Profile',
                  onTap: _openProfile,
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
    return Material(
      color: Theme.of(context).colorScheme.surface,
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
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: AppColors.primary, size: 27),
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
