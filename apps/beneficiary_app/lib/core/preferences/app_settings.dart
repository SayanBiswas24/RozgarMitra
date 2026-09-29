import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../localization/app_languages.dart';
import 'app_preferences.dart';

class AppSettings extends ChangeNotifier {
  Locale _locale;
  ThemeMode _themeMode;
  bool _notificationsEnabled;
  bool _voiceResponsesEnabled;

  AppSettings({
    Locale locale = const Locale('en'),
    ThemeMode themeMode = ThemeMode.light,
    bool notificationsEnabled = true,
    bool voiceResponsesEnabled = true,
  })  : _locale = locale,
        _themeMode = themeMode,
        _notificationsEnabled = notificationsEnabled,
        _voiceResponsesEnabled = voiceResponsesEnabled;

  static Future<AppSettings> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final languageCode = prefs.getString(AppPreferences.languageKey) ?? 'en';
      final themeString = prefs.getString(AppPreferences.themeKey) ?? 'light';
      final notifications = prefs.getBool(AppPreferences.notificationsKey) ?? true;
      final voiceResponses = prefs.getBool(AppPreferences.voiceResponsesKey) ?? true;

      ThemeMode mode;
      switch (themeString) {
        case 'dark':
          mode = ThemeMode.dark;
          break;
        case 'system':
          mode = ThemeMode.system;
          break;
        case 'light':
        default:
          mode = ThemeMode.light;
      }

      return AppSettings(
        locale: Locale(languageCode),
        themeMode: mode,
        notificationsEnabled: notifications,
        voiceResponsesEnabled: voiceResponses,
      );
    } catch (_) {
      return AppSettings();
    }
  }

  Locale get locale => _locale;
  ThemeMode get themeMode => _themeMode;
  bool get notificationsEnabled => _notificationsEnabled;
  bool get voiceResponsesEnabled => _voiceResponsesEnabled;

  bool get isDarkMode => _themeMode == ThemeMode.dark;
  AppLanguage get currentLanguage => AppLanguages.fromLocale(_locale);

  void setLocale(Locale locale) {
    if (_locale == locale) return;
    _locale = locale;
    notifyListeners();
    _saveString(AppPreferences.languageKey, locale.languageCode);
  }

  void setThemeMode(ThemeMode mode) {
    if (_themeMode == mode) return;
    _themeMode = mode;
    notifyListeners();
    _saveString(
      AppPreferences.themeKey,
      mode == ThemeMode.dark
          ? 'dark'
          : mode == ThemeMode.light
              ? 'light'
              : 'system',
    );
  }

  void toggleThemeMode() {
    setThemeMode(isDarkMode ? ThemeMode.light : ThemeMode.dark);
  }

  void setNotifications(bool enabled) {
    if (_notificationsEnabled == enabled) return;
    _notificationsEnabled = enabled;
    notifyListeners();
    _saveBool(AppPreferences.notificationsKey, enabled);
  }

  void setVoiceResponses(bool enabled) {
    if (_voiceResponsesEnabled == enabled) return;
    _voiceResponsesEnabled = enabled;
    notifyListeners();
    _saveBool(AppPreferences.voiceResponsesKey, enabled);
  }

  void _saveString(String key, String value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
    } catch (_) {}
  }

  void _saveBool(String key, bool value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, value);
    } catch (_) {}
  }
}
