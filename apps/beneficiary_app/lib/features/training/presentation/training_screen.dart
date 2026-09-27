import 'dart:async';
import 'package:beneficiary_app/core/services/api_service.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({super.key});

  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen> {
  int _selectedCategory = 0;
  List<String> _categories = ['All'];

  List<Map<String, dynamic>> _opportunities = [];
  int _totalOpportunities = 0;
  int _currentPage = 1;
  int _totalPages = 1;
  bool _isLoading = true;
  String? _errorMessage;
  String? _userDistrict;

  bool _isLoggedIn = false;

  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    _isLoggedIn = await ApiService.instance.isLoggedIn();
    _loadCategories();
    _loadOpportunities(resetPage: true);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await ApiService.instance.getTrainingCategories();
      if (mounted) {
        setState(() {
          _categories = categories;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadOpportunities({bool resetPage = false}) async {
    if (resetPage) {
      _currentPage = 1;
    }

    final loggedIn = await ApiService.instance.isLoggedIn();

    if (mounted) {
      setState(() {
        _isLoggedIn = loggedIn;
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final selectedCat = _selectedCategory == 0 ? null : _categories[_selectedCategory];
      final search = _searchQuery.trim().isEmpty ? null : _searchQuery.trim();

      final res = await ApiService.instance.getTrainingOpportunities(
        page: _currentPage,
        limit: 20,
        category: selectedCat,
        search: search,
        district: _userDistrict,
      );

      if (mounted) {
        final list = (res['opportunities'] as List<dynamic>?)
                ?.map((e) => e as Map<String, dynamic>)
                .toList() ??
            [];

        setState(() {
          _opportunities = list;
          _totalOpportunities = (res['total'] as num?)?.toInt() ?? list.length;
          _totalPages = (res['totalPages'] as num?)?.toInt() ?? 1;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
      setState(() {
        _searchQuery = query;
      });
      _loadOpportunities(resetPage: true);
    });
  }

  void _onCategorySelected(int index) {
    if (_selectedCategory == index) return;
    setState(() {
      _selectedCategory = index;
    });
    _loadOpportunities(resetPage: true);
  }

  Future<void> _launchExternalUrl(String? urlString) async {
    if (urlString == null || urlString.trim().isEmpty) return;
    try {
      final uri = Uri.parse(urlString.trim());
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open link: $urlString')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Training & Opportunities')),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await _loadCategories();
                await _loadOpportunities(resetPage: true);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildIntro(context),

                    const SizedBox(height: 20),

                    _buildRecommendedCard(context),

                    const SizedBox(height: 20),

                    _buildSearchBar(context),

                    const SizedBox(height: 24),

                    _buildSectionTitle(context, 'Explore by category'),

                    const SizedBox(height: 12),

                    _buildCategories(context),

                    const SizedBox(height: 28),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionTitle(
                                context,
                                _totalOpportunities > 0
                                    ? 'Available opportunities ($_totalOpportunities)'
                                    : 'Available opportunities',
                              ),
                              const SizedBox(height: 4),
                              InkWell(
                                onTap: () async {
                                  final TextEditingController ctrl = TextEditingController(text: _userDistrict ?? '');
                                  final newDist = await showDialog<String>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title: const Text('Filter by Location'),
                                      content: TextField(
                                        controller: ctrl,
                                        autofocus: true,
                                        decoration: InputDecoration(
                                          labelText: 'Enter District',
                                          hintText: 'e.g. Patna (leave empty for all)',
                                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                        ),
                                      ),
                                      actions: [
                                        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                                        ElevatedButton(
                                          onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
                                          child: const Text('Apply'),
                                        ),
                                      ],
                                    ),
                                  );

                                  if (newDist != null && mounted) {
                                    setState(() {
                                      _userDistrict = newDist.isEmpty ? null : newDist;
                                    });
                                    _loadOpportunities(resetPage: true);
                                  }
                                },
                                borderRadius: BorderRadius.circular(4),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 2.0, horizontal: 4.0),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        _userDistrict != null ? Icons.location_on : Icons.location_off,
                                        size: 14,
                                        color: AppColors.primary,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _userDistrict != null ? 'Near $_userDistrict' : 'All Locations',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(Icons.edit_rounded, size: 12, color: AppColors.primary),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_isLoading)
                          const Padding(
                            padding: EdgeInsets.only(bottom: 8.0, right: 8.0),
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    _buildOpportunityContent(context),

                    if (!_isLoading && _totalPages > 1) ...[
                      const SizedBox(height: 20),
                      _buildPaginationControls(context),
                    ],
                  ],
                ),
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
          'Explore real skill training programs and livelihood courses '
          'designed for SC beneficiaries with fee waivers, stipends, and placement support.',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendedCard(BuildContext context) {
    return InkWell(
      onTap: () {
        context.push('/assistant');
      },
      borderRadius: BorderRadius.circular(18),
      child: Container(
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
            const SizedBox(width: 8),
            Icon(
              Icons.chevron_right_rounded,
              color: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant,
        ),
      ),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search courses, roles, skills, or center...',
          hintStyle: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontSize: 14,
          ),
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 20),
                  onPressed: () {
                    _searchController.clear();
                    _onSearchChanged('');
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        onChanged: _onSearchChanged,
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
            onSelected: (_) => _onCategorySelected(index),
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

  Widget _buildOpportunityContent(BuildContext context) {
    if (_isLoading && _opportunities.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'Loading opportunities...',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_errorMessage != null && _opportunities.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.error.withValues(alpha: 0.3),
          ),
        ),
        child: Column(
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 40,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 12),
            Text(
              'Unable to load courses',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.error,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _loadOpportunities(resetPage: true),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_opportunities.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
        child: Column(
          children: [
            Icon(
              Icons.school_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 14),
            const Text(
              'No training opportunities found',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _searchQuery.isNotEmpty || _selectedCategory != 0
                  ? 'Try changing your search term or selecting another category.'
                  : 'Check back later for newly announced training batches.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            if (_searchQuery.isNotEmpty || _selectedCategory != 0) ...[
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  _searchController.clear();
                  setState(() {
                    _searchQuery = '';
                    _selectedCategory = 0;
                  });
                  _loadOpportunities(resetPage: true);
                },
                child: const Text('Reset filters'),
              ),
            ],
          ],
        ),
      );
    }

    return Column(
      children: _opportunities.map((opportunity) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: _OpportunityCard(
            opportunity: opportunity,
            isLoggedIn: _isLoggedIn,
            onTap: () {
              _showOpportunityDetails(context, opportunity);
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPaginationControls(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton.outlined(
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: _currentPage > 1
              ? () {
                  setState(() {
                    _currentPage--;
                  });
                  _loadOpportunities();
                }
              : null,
        ),
        const SizedBox(width: 16),
        Text(
          'Page $_currentPage of $_totalPages',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
        const SizedBox(width: 16),
        IconButton.outlined(
          icon: const Icon(Icons.chevron_right_rounded),
          onPressed: _currentPage < _totalPages
              ? () {
                  setState(() {
                    _currentPage++;
                  });
                  _loadOpportunities();
                }
              : null,
        ),
      ],
    );
  }

  void _showOpportunityDetails(
    BuildContext context,
    Map<String, dynamic> rawOpportunity,
  ) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (context) {
        return OpportunityDetailsSheet(
          opportunityId: rawOpportunity['id']?.toString() ?? '',
          fallbackData: rawOpportunity,
          onOpenUrl: _launchExternalUrl,
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
                  onTap: () {
                    context.go('/profile');
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
  final Map<String, dynamic> opportunity;
  final bool isLoggedIn;
  final VoidCallback onTap;

  const _OpportunityCard({
    required this.opportunity,
    required this.onTap,
    this.isLoggedIn = false,
  });

  IconData _getSectorIcon(String? sector) {
    if (sector == null) return Icons.school_rounded;
    final s = sector.toLowerCase();
    if (s.contains('it') || s.contains('software')) return Icons.computer_rounded;
    if (s.contains('electronic')) return Icons.electrical_services_rounded;
    if (s.contains('media') || s.contains('entertainment')) return Icons.movie_creation_outlined;
    if (s.contains('solar') || s.contains('renewable') || s.contains('energy')) return Icons.solar_power_rounded;
    if (s.contains('textile') || s.contains('tailoring') || s.contains('handloom')) return Icons.content_cut_rounded;
    if (s.contains('health') || s.contains('medical')) return Icons.medical_services_outlined;
    if (s.contains('construct')) return Icons.construction_rounded;
    if (s.contains('beauty') || s.contains('wellness')) return Icons.spa_outlined;
    if (s.contains('auto')) return Icons.directions_car_outlined;
    if (s.contains('management') || s.contains('entrepreneur') || s.contains('business')) return Icons.business_center_outlined;
    if (s.contains('farm') || s.contains('agri')) return Icons.agriculture_rounded;
    return Icons.school_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final title = opportunity['courseName']?.toString() ??
        opportunity['title']?.toString() ??
        'Course';
    final jobRole = opportunity['jobRole']?.toString() ??
        opportunity['subSector']?.toString() ??
        opportunity['sector']?.toString() ??
        'Vocational Qualification';
    final mode = opportunity['mode']?.toString() ??
        (opportunity['trainingType'] != null ? 'Vocational' : 'Offline');
    final sector = opportunity['sector']?.toString() ?? opportunity['category']?.toString();
    final education = opportunity['minimumEducation']?.toString() ??
        (opportunity['nsqfLevel'] != null ? 'NSQF Level ${opportunity['nsqfLevel']}' : 'Eligible for All');
    final freeForSc = opportunity['freeForSc']?.toString() ??
        (opportunity['freeForSc'] == null ? 'Yes' : 'No');
    final stipend = opportunity['stipendAvailable']?.toString();
    final centerName = opportunity['centerName']?.toString() ??
        opportunity['providerName']?.toString() ??
        'Government Verified Institute';
    final district = opportunity['district']?.toString();
    final state = opportunity['state']?.toString();
    final registrationOpen = opportunity['registrationOpen']?.toString();
    final duration = opportunity['duration']?.toString() ??
        (opportunity['durationHours'] != null ? '${opportunity['durationHours']} hrs' : 'Self-Paced');
    final distanceKm = opportunity['distanceKm'];

    // Location label
    String? locationText;
    if (district != null && state != null) {
      locationText = '$district, $state';
    } else if (district != null) {
      locationText = district;
    } else if (state != null) {
      locationText = state;
    } else {
      locationText = 'National / All India';
    }

    final isRecommended = isLoggedIn && (opportunity['isRecommended'] == true);
    final recommendationReasons = (opportunity['recommendationReasons'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList();

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _getSectorIcon(sector),
                      color: AppColors.primary,
                      size: 24,
                    ),
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
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (jobRole != null && jobRole.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            jobRole,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(width: 8),

                  const Icon(Icons.arrow_forward_ios_rounded, size: 15),
                ],
              ),

              const SizedBox(height: 12),

              // Badges row: Golden Recommended badge, Mode, Free for SC, Stipend, Education
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  if (isRecommended)
                    _Badge(
                      label: 'Recommended for you',
                      icon: Icons.auto_awesome_rounded,
                      backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                      textColor: AppColors.primary,
                    ),
                  if (mode != null && mode.isNotEmpty)
                    _Badge(
                      label: mode,
                      icon: mode.toLowerCase() == 'hybrid'
                          ? Icons.laptop_chromebook_rounded
                          : Icons.location_city_rounded,
                      backgroundColor: Theme.of(context).colorScheme.secondaryContainer.withValues(alpha: 0.6),
                      textColor: Theme.of(context).colorScheme.onSecondaryContainer,
                    ),
                  if (freeForSc == 'Yes')
                    _Badge(
                      label: 'Free for SC',
                      icon: Icons.check_circle_outline_rounded,
                      backgroundColor: Colors.green.withValues(alpha: 0.12),
                      textColor: Colors.green.shade800,
                    ),
                  if (stipend == 'Yes')
                    _Badge(
                      label: 'Stipend Available',
                      icon: Icons.payments_outlined,
                      backgroundColor: Colors.amber.withValues(alpha: 0.18),
                      textColor: Colors.amber.shade900,
                    ),
                  if (education != null && education.isNotEmpty)
                    _Badge(
                      label: education,
                      icon: Icons.school_outlined,
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      textColor: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                ],
              ),

              if (isRecommended && recommendationReasons != null && recommendationReasons.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.stars_rounded, size: 14, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        recommendationReasons.first,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 12),

              const Divider(height: 1),

              const SizedBox(height: 10),

              // Bottom details row: Location & Center, Duration, Registration status
              Row(
                children: [
                  if (centerName != null || locationText != null) ...[
                    Icon(
                      Icons.location_on_outlined,
                      size: 15,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        [
                          if (centerName != null) centerName,
                          if (locationText != null) locationText,
                          if (distanceKm != null) '${distanceKm}km',
                        ].join(' • '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                  if (duration != null && duration.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Icon(
                      Icons.schedule_rounded,
                      size: 14,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      duration,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  if (registrationOpen == 'Yes') ...[
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Open',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.green.shade800,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color backgroundColor;
  final Color textColor;
  final Color? borderColor;

  const _Badge({
    required this.label,
    this.icon,
    required this.backgroundColor,
    required this.textColor,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: borderColor != null ? Border.all(color: borderColor!, width: 1.0) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: textColor),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}

class OpportunityDetailsSheet extends StatefulWidget {
  final String opportunityId;
  final Map<String, dynamic> fallbackData;
  final Function(String?) onOpenUrl;

  const OpportunityDetailsSheet({
    super.key,
    required this.opportunityId,
    required this.fallbackData,
    required this.onOpenUrl,
  });

  @override
  State<OpportunityDetailsSheet> createState() =>
      _OpportunityDetailsSheetState();
}

class _OpportunityDetailsSheetState extends State<OpportunityDetailsSheet> {
  Map<String, dynamic>? _fullData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFullDetails();
  }

  Future<void> _loadFullDetails() async {
    try {
      final details = await ApiService.instance.getTrainingOpportunityDetails(
        widget.opportunityId,
      );
      if (mounted) {
        setState(() {
          _fullData = details;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _fullData = widget.fallbackData;
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildFieldRow(String label, dynamic value) {
    if (value == null) return const SizedBox.shrink();
    final str = value.toString().trim();
    if (str.isEmpty ||
        str == '—' ||
        str == '-' ||
        str == '–' ||
        str.toLowerCase() == 'null' ||
        str.toLowerCase() == 'undefined' ||
        str.toLowerCase() == 'n/a' ||
        str.toLowerCase() == 'unknown') {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              str,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard(String title, List<Widget> children) {
    final activeChildren = children.where((w) => w is! SizedBox).toList();
    if (activeChildren.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    Map<String, dynamic> data;
    if (_fullData != null) {
      data = (_fullData!.containsKey('opportunity') && _fullData!['opportunity'] is Map)
          ? _fullData!['opportunity'] as Map<String, dynamic>
          : _fullData!;
    } else {
      data = widget.fallbackData;
    }

    final course = data['course'] as Map<String, dynamic>? ?? data;
    final eligibility = data['eligibility'] as Map<String, dynamic>? ?? data;
    final fees = data['feesAndBenefits'] as Map<String, dynamic>? ?? data;
    final training = data['training'] as Map<String, dynamic>? ?? data;
    final availability = data['availability'] as Map<String, dynamic>? ?? data;
    final source = data['source'] as Map<String, dynamic>? ?? data;

    final courseName = course['courseName']?.toString() ??
        data['courseName']?.toString() ??
        'Training Opportunity';
    final jobRole = course['jobRole']?.toString() ?? data['jobRole']?.toString();
    final description = course['description']?.toString() ??
        course['schemeDescription']?.toString() ??
        data['description']?.toString();
    final appUrl = source['applicationUrl']?.toString() ?? data['applicationUrl']?.toString();
    final sourceUrl = source['sourceUrl']?.toString() ?? data['sourceUrl']?.toString();

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          courseName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (jobRole != null && jobRole.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            jobRole,
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_isLoading)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 16),
                        child: LinearProgressIndicator(),
                      ),

                    // Description if available
                    if (description != null && description.isNotEmpty) ...[
                      Text(
                        description,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              height: 1.45,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                      const SizedBox(height: 18),
                    ],

                    // Course Details Section
                    _buildSectionCard('Course Details', [
                      _buildFieldRow('Course Name', course['courseName'] ?? data['courseName']),
                      _buildFieldRow('Job Role', course['jobRole'] ?? data['jobRole']),
                      _buildFieldRow('Sector', course['sector'] ?? data['sector']),
                      _buildFieldRow('Sub-Sector', course['subSector'] ?? data['subSector']),
                      _buildFieldRow('NSQF Level', course['nsqfLevel'] ?? data['nsqfLevel']),
                      _buildFieldRow('Course Type', course['courseType'] ?? data['courseType']),
                      _buildFieldRow('Training Type', course['trainingType'] ?? data['trainingType']),
                      _buildFieldRow(
                        'Duration',
                        course['duration'] ??
                            (course['durationHours'] != null
                                ? '${course['durationHours']} hours'
                                : data['duration']),
                      ),
                      _buildFieldRow('Skills Acquired', course['skillsAcquired'] ?? data['skillsAcquired']),
                    ]),

                    // Eligibility Section
                    _buildSectionCard('Eligibility Requirements', [
                      _buildFieldRow(
                        'Target Category',
                        (eligibility['targetCategories'] ?? data['targetCategories'])
                            ?.toString()
                            .replaceAll(RegExp(r';?\bST\b;?'), '')
                            .replaceAll(RegExp(r'/ST'), ''),
                      ),
                      _buildFieldRow('Minimum Education', eligibility['minimumEducation'] ?? data['minimumEducation']),
                      _buildFieldRow('Minimum Age', eligibility['minimumAge'] != null ? '${eligibility['minimumAge']} years' : null),
                      _buildFieldRow('Maximum Age', eligibility['maximumAge'] != null ? '${eligibility['maximumAge']} years' : null),
                      _buildFieldRow('Income Limit', eligibility['incomeLimit'] ?? data['incomeLimit']),
                      _buildFieldRow('Gender Eligibility', eligibility['genderEligibility'] ?? data['genderEligibility']),
                      _buildFieldRow('Employment Type', eligibility['employmentType'] ?? data['employmentType']),
                    ]),

                    // Fees & Benefits Section
                    _buildSectionCard('Fees & Benefits', [
                      _buildFieldRow(
                        'Course Fee',
                        fees['courseFee'] != null ? '₹${fees['courseFee']}' : data['courseFee'] != null ? '₹${data['courseFee']}' : null,
                      ),
                      _buildFieldRow('Free for SC', fees['freeForSc'] ?? data['freeForSc']),
                      _buildFieldRow('Stipend Available', fees['stipendAvailable'] ?? data['stipendAvailable']),
                      _buildFieldRow('Certificate Provided', fees['certificateProvided'] ?? data['certificateProvided']),
                      _buildFieldRow('Placement Support', fees['placementAvailable'] ?? data['placementAvailable']),
                    ]),

                    // Training Centre & Location Section
                    _buildSectionCard('Training Centre & Location', [
                      _buildFieldRow('Mode', training['mode'] ?? data['mode']),
                      _buildFieldRow('Center Name', training['centerName'] ?? data['centerName']),
                      _buildFieldRow('Center Type', training['centerType'] ?? data['centerType']),
                      _buildFieldRow('Provider Name', training['providerName'] ?? data['providerName']),
                      _buildFieldRow('Provider Type', training['providerType'] ?? data['providerType']),
                      _buildFieldRow('Address', training['address'] ?? data['address']),
                      _buildFieldRow('District', training['district'] ?? data['district']),
                      _buildFieldRow('State', training['state'] ?? data['state']),
                      _buildFieldRow('Block', training['block'] ?? data['block']),
                      _buildFieldRow('Pincode', training['pincode'] ?? data['pincode']),
                      _buildFieldRow(
                        'Distance',
                        data['distanceKm'] != null ? '${data['distanceKm']} km away' : null,
                      ),
                      _buildFieldRow('Phone', training['phone'] ?? data['phone']),
                      _buildFieldRow('Email', training['email'] ?? data['email']),
                    ]),

                    // Batch & Availability Section
                    _buildSectionCard('Batch & Availability', [
                      _buildFieldRow('Batch Status', availability['batchStatus'] ?? data['batchStatus']),
                      _buildFieldRow('Start Date', availability['batchStartDate'] ?? data['batchStartDate']),
                      _buildFieldRow('End Date', availability['batchEndDate'] ?? data['batchEndDate']),
                      _buildFieldRow('Class Timing', availability['classTiming'] ?? data['classTiming']),
                      _buildFieldRow('Days per Week', availability['daysPerWeek'] ?? data['daysPerWeek']),
                      _buildFieldRow('Total Seats', availability['seatsTotal'] ?? data['seatsTotal']),
                      _buildFieldRow('Seats Available', availability['seatsAvailable'] ?? data['seatsAvailable']),
                      _buildFieldRow('Registration Open', availability['registrationOpen'] ?? data['registrationOpen']),
                      _buildFieldRow('Deadline', availability['registrationDeadline'] ?? data['registrationDeadline']),
                    ]),

                    // Source & Scheme Section
                    _buildSectionCard('Official Scheme & Verification', [
                      _buildFieldRow('Scheme Name', source['schemeName'] ?? data['schemeName']),
                      _buildFieldRow('Department', source['department'] ?? data['department']),
                      _buildFieldRow('Source Name', source['sourceName'] ?? data['sourceName']),
                      _buildFieldRow('Last Verified', source['lastVerifiedDate'] ?? data['lastVerifiedDate']),
                      _buildFieldRow('Verification Status', source['verificationStatus'] ?? data['verificationStatus']),
                    ]),

                    // Action: Official Source Link
                    if (sourceUrl != null && sourceUrl.isNotEmpty) ...[
                      OutlinedButton.icon(
                        onPressed: () => widget.onOpenUrl(sourceUrl),
                        icon: const Icon(Icons.verified_outlined, size: 18),
                        label: const Text('View Official Source / Portal'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 46),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],

                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),

            // Sticky Bottom Action: Apply / Registration
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(
                  top: BorderSide(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
              ),
              child: SafeArea(
                top: false,
                child: appUrl != null && appUrl.isNotEmpty
                    ? SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton.icon(
                          onPressed: () => widget.onOpenUrl(appUrl),
                          icon: const Icon(Icons.how_to_reg_rounded),
                          label: const Text(
                            'Apply / Register Now',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      )
                    : SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Close'),
                        ),
                      ),
              ),
            ),
          ],
        );
      },
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
