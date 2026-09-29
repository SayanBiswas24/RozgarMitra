import 'dart:async';

import 'package:beneficiary_app/core/widgets/app_logo.dart';
import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  Timer? _autoAdvanceTimer;
  bool _userInteracted = false;

  @override
  void initState() {
    super.initState();
    _startAutoAdvance();
  }

  void _startAutoAdvance() {
    _autoAdvanceTimer?.cancel();
    _autoAdvanceTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_userInteracted || !mounted) {
        timer.cancel();
        return;
      }
      if (_currentPage < 2) {
        _pageController.animateToPage(
          _currentPage + 1,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOutCubic,
        );
      } else {
        timer.cancel();
      }
    });
  }

  void _onUserInteraction() {
    if (!_userInteracted) {
      _userInteracted = true;
      _autoAdvanceTimer?.cancel();
    }
  }

  void _goToLanguageSelection() {
    _autoAdvanceTimer?.cancel();
    if (!mounted) return;
    context.go('/language');
  }

  void _handleNext() {
    _onUserInteraction();
    if (_currentPage < 2) {
      _pageController.animateToPage(
        _currentPage + 1,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
      );
    } else {
      _goToLanguageSelection();
    }
  }

  @override
  void dispose() {
    _autoAdvanceTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final slides = [
      _SlideData(
        badge: l10n?.splashSlide1Badge ?? 'PM-AJAY Skilling',
        title: l10n?.splashSlide1Title ?? 'Discover Livelihood & Skills',
        subtitle: l10n?.splashSlide1Subtitle ??
            'Explore PM-AJAY vocational training programs designed to enhance your income and build sustainable livelihoods.',
        icon: Icons.school_rounded,
        accentColor: AppColors.primary,
        chips: const ['Skill Training', 'Certified Courses', 'PM-AJAY Support'],
      ),
      _SlideData(
        badge: l10n?.splashSlide2Badge ?? 'Multilingual Voice AI',
        title: l10n?.splashSlide2Title ?? 'Voice Assistant in Your Language',
        subtitle: l10n?.splashSlide2Subtitle ??
            'Speak naturally with Saathi in your mother tongue to discover schemes, trades, and guidance step-by-step.',
        icon: Icons.record_voice_over_rounded,
        accentColor: const Color(0xFF2E7D32),
        chips: const ['Mother Tongue', 'Voice-First', 'Instant Guidance'],
      ),
      _SlideData(
        badge: l10n?.splashSlide3Badge ?? 'Self-Employment & Jobs',
        title: l10n?.splashSlide3Title ?? 'Direct Opportunities & Growth',
        subtitle: l10n?.splashSlide3Subtitle ??
            'Connect with certified training centers, self-employment grants, and local livelihoods to build your future.',
        icon: Icons.trending_up_rounded,
        accentColor: const Color(0xFFD97706),
        chips: const ['Enterprise Grants', 'Toolkit Assistance', 'Local Work'],
      ),
    ];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar with App Identity & Skip
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 20, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const AppLogo(
                        size: 40,
                        borderRadius: BorderRadius.all(Radius.circular(8)),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        l10n?.appName ?? 'Kaushal Saathi',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: _goToLanguageSelection,
                    style: TextButton.styleFrom(
                      foregroundColor: theme.colorScheme.onSurfaceVariant,
                      textStyle: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    child: Text(l10n?.skip ?? 'Skip'),
                  ),
                ],
              ),
            ),

            // Middle Carousel: 3 Slides
            Expanded(
              child: NotificationListener<ScrollNotification>(
                onNotification: (notification) {
                  if (notification is ScrollStartNotification) {
                    _onUserInteraction();
                  }
                  return false;
                },
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: slides.length,
                  onPageChanged: (index) {
                    setState(() {
                      _currentPage = index;
                    });
                  },
                  itemBuilder: (context, index) {
                    final slide = slides[index];
                    return _SlideContent(slide: slide, isDark: isDark);
                  },
                ),
              ),
            ),

            // Bottom Section: Indicators & Action Button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Page Indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(slides.length, (index) {
                      final isActive = index == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: isActive ? 28 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: isActive
                              ? (isDark ? AppColors.primaryLight : AppColors.primary)
                              : theme.colorScheme.outlineVariant,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),

                  const SizedBox(height: 24),

                  // Next / Get Started Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _handleNext,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _currentPage == 2
                                ? (l10n?.getStarted ?? 'Get Started')
                                : (l10n?.next ?? 'Next'),
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            _currentPage == 2
                                ? Icons.arrow_forward_rounded
                                : Icons.chevron_right_rounded,
                            size: 22,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlideData {
  final String badge;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accentColor;
  final List<String> chips;

  const _SlideData({
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
    required this.chips,
  });
}

class _SlideContent extends StatelessWidget {
  final _SlideData slide;
  final bool isDark;

  const _SlideContent({required this.slide, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 16),

          // Glowing Icon Badge
          Container(
            width: 140,
            height: 140,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDark
                  ? AppColors.primaryLight.withValues(alpha: 0.12)
                  : AppColors.primary.withValues(alpha: 0.09),
              border: Border.all(
                color: isDark
                    ? AppColors.primaryLight.withValues(alpha: 0.3)
                    : AppColors.primary.withValues(alpha: 0.2),
                width: 2,
              ),
            ),
            child: Center(
              child: Container(
                width: 104,
                height: 104,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDark
                      ? AppColors.primaryLight.withValues(alpha: 0.22)
                      : AppColors.primary.withValues(alpha: 0.16),
                ),
                child: Icon(
                  slide.icon,
                  size: 52,
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                ),
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Thematic Tag / Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.primaryLight.withValues(alpha: 0.15)
                  : AppColors.primary.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              slide.badge,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                letterSpacing: 0.4,
              ),
            ),
          ),

          const SizedBox(height: 18),

          // Slide Title
          Text(
            slide.title,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              height: 1.25,
            ),
          ),

          const SizedBox(height: 14),

          // Slide Subtitle
          Text(
            slide.subtitle,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.55,
              fontSize: 15,
            ),
          ),

          const SizedBox(height: 24),

          // Chips highlighting themes
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: slide.chips.map((chip) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: theme.colorScheme.outlineVariant),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.check_circle_outline_rounded,
                      size: 15,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      chip,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
