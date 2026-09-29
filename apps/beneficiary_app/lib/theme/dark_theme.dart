import 'package:flutter/material.dart';

import 'app_colors.dart';

class DarkTheme {
  DarkTheme._();

  static ThemeData theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.backgroundDark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primaryLight,
      brightness: Brightness.dark,
      surface: const Color(0xFF1B221B),
      onSurface: const Color(0xFFF1F5F1),
      surfaceContainer: const Color(0xFF1E271E),
      surfaceContainerHighest: const Color(0xFF283428),
      outlineVariant: const Color(0xFF2F3D2F),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.backgroundDark,
      foregroundColor: Color(0xFFF1F5F1),
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: const Color(0xFF1B221B),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF2F3D2F)),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFF2B372B),
      thickness: 1,
      space: 1,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Color(0xFF171E17),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: const Color(0xFF1B221B),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: Color(0xFFF1F5F1),
      ),
      headlineMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: Color(0xFFF1F5F1),
      ),
      headlineSmall: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: Color(0xFFF1F5F1),
      ),
      titleLarge: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: Color(0xFFF1F5F1),
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: Color(0xFFF1F5F1),
      ),
      bodyLarge: TextStyle(fontSize: 16, height: 1.5, color: Color(0xFFF1F5F1)),
      bodyMedium: TextStyle(
        fontSize: 14,
        height: 1.5,
        color: Color(0xFFA5B2A5),
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        height: 1.4,
        color: Color(0xFFA5B2A5),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize: const Size(double.infinity, 54),
        backgroundColor: AppColors.primaryLight,
        foregroundColor: Colors.black,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
