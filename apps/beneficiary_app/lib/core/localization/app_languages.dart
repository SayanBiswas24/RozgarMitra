import 'package:flutter/material.dart';

class AppLanguage {
  final String name;
  final String nativeName;
  final Locale locale;

  const AppLanguage({
    required this.name,
    required this.nativeName,
    required this.locale,
  });

  String get code => locale.languageCode;
}

class AppLanguages {
  AppLanguages._();

  static const List<AppLanguage> supported = [
    AppLanguage(name: 'English', nativeName: 'English', locale: Locale('en')),
    AppLanguage(name: 'Hindi', nativeName: 'हिन्दी', locale: Locale('hi')),
    AppLanguage(name: 'Bengali', nativeName: 'বাংলা', locale: Locale('bn')),
    AppLanguage(name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', locale: Locale('sat')),
    AppLanguage(name: 'Mundari', nativeName: 'ᱢᱩᱱᱰᱟᱹᱨᱤ', locale: Locale('unr')),
  ];

  static AppLanguage fromLocale(Locale locale) {
    return supported.firstWhere(
      (lang) => lang.locale.languageCode == locale.languageCode,
      orElse: () => supported.first,
    );
  }

  static AppLanguage fromCode(String code) {
    return supported.firstWhere(
      (lang) => lang.code == code,
      orElse: () => supported.first,
    );
  }

  static AppLanguage fromName(String name) {
    return supported.firstWhere(
      (lang) =>
          lang.name.toLowerCase() == name.toLowerCase() ||
          lang.nativeName.toLowerCase() == name.toLowerCase(),
      orElse: () => supported.first,
    );
  }
}

