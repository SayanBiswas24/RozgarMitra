import 'package:flutter/material.dart';

import 'app/app.dart';
import 'core/preferences/app_settings.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final settings = await AppSettings.load();

  runApp(KaushalSaathiApp(settings: settings));
}
