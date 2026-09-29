import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_bn.dart';
import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_sat.dart';
import 'app_localizations_unr.dart';

// ignore_for_file: type=lint

abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    FallbackMaterialLocalizationsDelegate(),
    FallbackCupertinoLocalizationsDelegate(),
  ];

  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
    Locale('bn'),
    Locale('sat'),
    Locale('unr'),
  ];

  // Core & identity
  String get appName;
  String get continueText;
  String get back;
  String get settings;
  String get language;

  // Language selection
  String get chooseLanguage;
  String get chooseLanguageSubtitle;
  String get assistantLanguageNotice;
  String get changeLanguageNotice;

  // Splash slides
  String get splashSlide1Title;
  String get splashSlide1Subtitle;
  String get splashSlide1Badge;
  String get splashSlide2Title;
  String get splashSlide2Subtitle;
  String get splashSlide2Badge;
  String get splashSlide3Title;
  String get splashSlide3Subtitle;
  String get splashSlide3Badge;
  String get skip;
  String get next;
  String get getStarted;

  // Home screen
  String get namaste;
  String get homeGreeting;
  String get talkToSaathi;
  String get startTalking;
  String get assistantDescription;
  String get whatAreYouLookingFor;
  String get findTraining;
  String get findWork;
  String get opportunitiesNearYou;
  String get tailoringStitching;
  String get skillTraining;
  String get modernFarming;
  String get trainingLivelihood;
  String get smallBusiness;
  String get enterpriseOpportunities;
  String get yourProgress;
  String get progressPercentage;
  String get yourJourney;
  String get completeProfileRecommendation;
  String get home;

  // Assistant screen
  String get assistant;
  String get saathi;
  String get livelihoodAssistant;
  String get listening;
  String get tapMicrophone;
  String get tapAgainToFinish;
  String get speakNaturallyNotice;
  String get saathiGreeting1;
  String get saathiGreeting2;

  // Training screen
  String get training;
  String get all;
  String get farming;
  String get business;
  String get technical;
  String get services;
  String get findRightOpportunity;
  String get exploreTrainingDescription;
  String get getPersonalisedSuggestions;
  String get talkToSaathiSuggestions;
  String get exploreByCategory;
  String get availableOpportunities;
  String get viewDetails;
  String get mobileRepair;
  String get smallBusinessBasics;
  String get electricianTraining;

  // Profile screen
  String get profile;
  String get aboutYou;
  String get education;
  String get currentOccupation;
  String get skills;
  String get interests;
  String get location;
  String get workPreferences;
  String get completeYourProfile;
  String get profileHelpText;
  String get notAddedYet;
  String get addYourSkills;
  String get tellUsWhatYouLike;
  String get whatKindOfWork;
  String get howFarCanYouTravel;
  String get notSelected;

  // Settings screen
  String get preferences;
  String get darkMode;
  String get useDarkAppearance;
  String get notifications;
  String get notificationsSubtitle;
  String get voiceAssistant;
  String get voiceResponses;
  String get voiceResponsesSubtitle;
  String get voiceLanguage;
  String get voiceSpeed;
  String get normal;
  String get information;
  String get aboutKaushalSaathi;
  String get aboutSubtitle;
  String get aboutDescription;
  String get helpSupport;
  String get helpSupportSubtitle;
  String get privacy;
  String get privacySubtitle;
  String get versionText;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi', 'bn', 'sat', 'unr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
    case 'bn':
      return AppLocalizationsBn();
    case 'sat':
      return AppLocalizationsSat();
    case 'unr':
      return AppLocalizationsUnr();
  }

  return AppLocalizationsEn();
}

class FallbackMaterialLocalizationsDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  const FallbackMaterialLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<MaterialLocalizations> load(Locale locale) =>
      DefaultMaterialLocalizations.load(locale);

  @override
  bool shouldReload(FallbackMaterialLocalizationsDelegate old) => false;
}

class FallbackCupertinoLocalizationsDelegate
    extends LocalizationsDelegate<CupertinoLocalizations> {
  const FallbackCupertinoLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<CupertinoLocalizations> load(Locale locale) =>
      DefaultCupertinoLocalizations.load(locale);

  @override
  bool shouldReload(FallbackCupertinoLocalizationsDelegate old) => false;
}
