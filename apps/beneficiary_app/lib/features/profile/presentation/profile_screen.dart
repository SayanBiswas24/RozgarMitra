import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = true;
  bool _isLoggedIn = false;
  Map<String, dynamic>? _profileData;

  @override
  void initState() {
    super.initState();
    _checkAuthAndLoad();
  }

  Future<void> _checkAuthAndLoad() async {
    setState(() => _isLoading = true);
    final loggedIn = await ApiService.instance.isLoggedIn();
    if (loggedIn) {
      try {
        final profile = await ApiService.instance.getProfile();
        if (mounted) {
          setState(() {
            _isLoggedIn = true;
            _profileData = profile;
            _isLoading = false;
          });
        }
        return;
      } catch (_) {
        // If token expired or failed, fall through to logged-out state
        await ApiService.instance.clearSession();
      }
    }

    if (mounted) {
      setState(() {
        _isLoggedIn = false;
        _profileData = null;
        _isLoading = false;
      });
    }
  }

  void _showAuthModal({bool initialIsRegister = false}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return _AuthBottomSheet(
          initialIsRegister: initialIsRegister,
          onAuthSuccess: () {
            Navigator.pop(context);
            _checkAuthAndLoad();
          },
        );
      },
    );
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log Out'),
        content: const Text('Are you sure you want to log out of your account?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Log Out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ApiService.instance.logout();
      _checkAuthAndLoad();
    }
  }

  Future<void> _updateProfileField(Map<String, dynamic> updateData) async {
    setState(() => _isLoading = true);
    try {
      final updated = await ApiService.instance.updateProfile(updateData);
      if (mounted) {
        setState(() {
          _profileData = updated;
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          if (_isLoggedIn)
            IconButton(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout_rounded),
              tooltip: 'Log Out',
            ),
          IconButton(
            onPressed: () {
              context.push('/settings');
            },
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                children: [
                  if (!_isLoggedIn) ...[
                    _buildLoggedOutHeader(context),
                    const SizedBox(height: 24),
                    _buildAuthPromptCard(context),
                  ] else ...[
                    _buildProfileHeader(context),
                    const SizedBox(height: 24),
                    _buildSectionTitle(context, 'About you'),
                    const SizedBox(height: 12),
                    _ProfileItem(
                      icon: Icons.school_outlined,
                      title: 'Education',
                      value: _getEducationValue(),
                      onTap: _selectEducation,
                    ),
                    _ProfileItem(
                      icon: Icons.work_outline_rounded,
                      title: 'Current occupation',
                      value: _getOccupationValue(),
                      onTap: _selectOccupation,
                    ),
                    _ProfileItem(
                      icon: Icons.handyman_outlined,
                      title: 'Skills',
                      value: _getSkillsValue(),
                      onTap: _selectSkills,
                    ),
                    _ProfileItem(
                      icon: Icons.favorite_border_rounded,
                      title: 'Interests',
                      value: _getInterestsValue(),
                      onTap: _selectInterests,
                    ),
                    _ProfileItem(
                      icon: Icons.location_on_outlined,
                      title: 'Location',
                      value: _getLocationValue(),
                      onTap: _selectLocation,
                    ),
                    const SizedBox(height: 28),
                    _buildSectionTitle(context, 'Work preferences'),
                    const SizedBox(height: 12),
                    _PreferenceCard(
                      icon: Icons.business_center_outlined,
                      title: 'What kind of work do you prefer?',
                      value: _getWorkTypeValue(),
                      onTap: _selectWorkPreference,
                    ),
                    const SizedBox(height: 12),
                    _PreferenceCard(
                      icon: Icons.directions_walk_outlined,
                      title: 'How far can you travel?',
                      value: _getTravelValue(),
                      onTap: _selectTravelDistance,
                    ),
                    if (_getCompletionPercentage() < 100) ...[
                      const SizedBox(height: 28),
                      _buildCompletionCard(context),
                    ],
                  ],
                ],
              ),
            ),
      bottomNavigationBar: _buildBottomNavigation(context),
    );
  }

  static const Map<String, String> _educationOptions = {
    'NON_EDUCATED': 'Non-Educated',
    'CLASS_10': 'Class 10',
    'CLASS_12': 'Class 12',
    'DEGREE': 'Degree',
  };

  static const Map<String, String> _occupationOptions = {
    'STUDENT': 'Student',
    'FARMER': 'Farmer',
    'DAILY_WAGE_WORKER': 'Daily Wage Worker',
    'PRIVATE_EMPLOYEE': 'Private Employee',
    'GOVERNMENT_EMPLOYEE': 'Government Employee',
    'SELF_EMPLOYED': 'Self Employed',
    'BUSINESS_OWNER': 'Business Owner',
    'SKILLED_WORKER': 'Skilled Worker',
    'UNEMPLOYED': 'Unemployed',
    'HOMEMAKER': 'Homemaker',
    'OTHER': 'Other',
  };

  static const Map<String, String> _skillOptions = {
    'BASIC_COMPUTER': 'Basic Computer',
    'MS_OFFICE': 'MS Office',
    'COMMUNICATION': 'Communication',
    'BASIC_ENGLISH': 'Basic English',
    'DRIVING': 'Driving',
    'ELECTRICAL_REPAIR': 'Electrical Repair',
    'PLUMBING': 'Plumbing',
    'CARPENTRY': 'Carpentry',
    'MASONRY': 'Masonry',
    'TAILORING': 'Tailoring',
    'STITCHING': 'Stitching',
    'MOBILE_REPAIR': 'Mobile Repair',
    'HANDICRAFT': 'Handicraft',
    'AGRICULTURE': 'Agriculture',
    'SALES': 'Sales',
    'CUSTOMER_SERVICE': 'Customer Service',
    'DIGITAL_MARKETING': 'Digital Marketing',
  };

  static const Map<String, String> _interestOptions = {
    'TECHNOLOGY': 'Technology',
    'ELECTRICAL_WORK': 'Electrical Work',
    'SOLAR_ENERGY': 'Solar Energy',
    'CONSTRUCTION': 'Construction',
    'AGRICULTURE': 'Agriculture',
    'HEALTHCARE': 'Healthcare',
    'EDUCATION': 'Education',
    'RETAIL': 'Retail',
    'BUSINESS': 'Business',
    'ENTREPRENEURSHIP': 'Entrepreneurship',
    'HANDICRAFTS': 'Handicrafts',
    'BEAUTY_WELLNESS': 'Beauty & Wellness',
    'AUTOMOBILE': 'Automobile',
    'DIGITAL_SERVICES': 'Digital Services',
    'CREATIVE_WORK': 'Creative Work',
  };

  // --- Value Getters with Fallbacks ---

  String _getEducationValue() {
    final aboutYou = _profileData?['aboutYou'];
    if (aboutYou != null) {
      if (aboutYou['educationLabel'] != null && aboutYou['educationLabel'].toString().isNotEmpty) {
        return aboutYou['educationLabel'].toString();
      }
      final edu = aboutYou['education']?.toString();
      if (edu != null && edu.isNotEmpty) {
        return _educationOptions[edu] ?? edu;
      }
    }
    return 'Not added yet';
  }

  String _getOccupationValue() {
    final aboutYou = _profileData?['aboutYou'];
    if (aboutYou != null) {
      if (aboutYou['occupationLabel'] != null && aboutYou['occupationLabel'].toString().isNotEmpty) {
        return aboutYou['occupationLabel'].toString();
      }
      if (aboutYou['occupation_other'] != null && aboutYou['occupation_other'].toString().isNotEmpty) {
        return aboutYou['occupation_other'].toString();
      }
      final occType = aboutYou['occupation_type']?.toString();
      if (occType != null && _occupationOptions.containsKey(occType)) {
        return _occupationOptions[occType]!;
      }
      if (aboutYou['occupation'] != null && aboutYou['occupation'].toString().isNotEmpty) {
        return aboutYou['occupation'].toString();
      }
    }
    return 'Not added yet';
  }

  String _getSkillsValue() {
    final aboutYou = _profileData?['aboutYou'];
    final skills = aboutYou?['skills'];
    final otherSkills = aboutYou?['other_skills'];
    final all = <String>[];
    if (skills is List) {
      for (final s in skills) {
        all.add(_skillOptions[s.toString()] ?? s.toString());
      }
    }
    if (otherSkills is List) {
      for (final s in otherSkills) {
        if (s.toString().isNotEmpty) all.add(s.toString());
      }
    }
    if (all.isNotEmpty) {
      return all.join(', ');
    }
    return 'Add your skills';
  }

  String _getInterestsValue() {
    final aboutYou = _profileData?['aboutYou'];
    final interests = aboutYou?['interests'];
    final otherInterests = aboutYou?['other_interests'];
    final all = <String>[];
    if (interests is List) {
      for (final i in interests) {
        all.add(_interestOptions[i.toString()] ?? i.toString());
      }
    }
    if (otherInterests is List) {
      for (final i in otherInterests) {
        if (i.toString().isNotEmpty) all.add(i.toString());
      }
    }
    if (all.isNotEmpty) {
      return all.join(', ');
    }
    return 'Tell us what you like';
  }

  String _getLocationValue() {
    final loc = _profileData?['aboutYou']?['location'];
    if (loc is Map) {
      final parts = <String>[];
      if (loc['village'] != null && loc['village'].toString().isNotEmpty) parts.add(loc['village'].toString());
      if (loc['block'] != null && loc['block'].toString().isNotEmpty) parts.add(loc['block'].toString());
      if (loc['district'] != null && loc['district'].toString().isNotEmpty) parts.add(loc['district'].toString());
      if (loc['state'] != null && loc['state'].toString().isNotEmpty) parts.add(loc['state'].toString());
      if (loc['pincode'] != null && loc['pincode'].toString().isNotEmpty) parts.add('PIN: ${loc['pincode']}');
      if (parts.isNotEmpty) return parts.join(', ');
    }
    return 'Not added yet';
  }

  String _getWorkTypeValue() {
    return _profileData?['workPreferences']?['workTypePreference'] ?? 'Not selected';
  }

  String _getTravelValue() {
    final wp = _profileData?['workPreferences'];
    final pref = wp?['travelPreference'];
    final radius = wp?['mobility_radius_km'];
    if (pref != null && radius != null) {
      return '$pref (up to $radius km)';
    }
    if (pref != null) return pref.toString();
    if (radius != null) return 'Up to $radius km';
    return 'Not selected';
  }

  void _selectEducation() {
    String? selected = _profileData?['aboutYou']?['educationEnum'] ?? _profileData?['aboutYou']?['education'];
    if (selected != null && !_educationOptions.containsKey(selected)) {
      if (selected.contains('10')) {
        selected = 'CLASS_10';
      } else if (selected.contains('12')) {
        selected = 'CLASS_12';
      } else if (selected.toUpperCase().contains('DEGREE') || selected.toUpperCase().contains('GRAD')) {
        selected = 'DEGREE';
      } else {
        selected = 'NON_EDUCATED';
      }
    }

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Education Level'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: _educationOptions.entries.map((entry) {
                    return RadioListTile<String>(
                      title: Text(entry.value),
                      value: entry.key,
                      groupValue: selected,
                      onChanged: (val) {
                        setDialogState(() => selected = val);
                      },
                    );
                  }).toList(),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: selected == null
                      ? null
                      : () {
                          Navigator.pop(context);
                          _updateProfileField({'education': selected});
                        },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _selectOccupation() {
    String? selected = _profileData?['aboutYou']?['occupation_type'];
    final existingOther = _profileData?['aboutYou']?['occupation_other'] ?? '';
    final otherController = TextEditingController(text: existingOther.toString());

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Current Occupation'),
              content: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400, maxHeight: 500),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ..._occupationOptions.entries.map((entry) {
                        return RadioListTile<String>(
                          title: Text(entry.value),
                          value: entry.key,
                          groupValue: selected,
                          onChanged: (val) {
                            setDialogState(() => selected = val);
                          },
                        );
                      }),
                      if (selected == 'OTHER') ...[
                        const SizedBox(height: 10),
                        TextField(
                          controller: otherController,
                          autofocus: true,
                          decoration: InputDecoration(
                            labelText: 'Specify your occupation *',
                            hintText: 'e.g. Mobile Repair Technician',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: selected == null
                      ? null
                      : () {
                          if (selected == 'OTHER' && otherController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enter your occupation details.')),
                            );
                            return;
                          }
                          Navigator.pop(context);
                          if (selected == 'OTHER') {
                            _updateProfileField({
                              'occupation_type': 'OTHER',
                              'occupation_other': otherController.text.trim(),
                            });
                          } else {
                            _updateProfileField({
                              'occupation_type': selected,
                            });
                          }
                        },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _selectSkills() {
    final currentSkills = List<String>.from(_profileData?['aboutYou']?['skills'] ?? []);
    final currentOther = List<String>.from(_profileData?['aboutYou']?['other_skills'] ?? []);
    
    // Gather all existing skills as readable names
    final initialList = <String>[];
    for (final s in currentSkills) {
      initialList.add(_skillOptions[s] ?? s);
    }
    for (final s in currentOther) {
      if (s.isNotEmpty && !initialList.contains(s)) {
        initialList.add(s);
      }
    }

    final textController = TextEditingController(text: initialList.join(', '));

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Skills'),
              content: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Write your skills separated by commas:',
                      style: TextStyle(fontSize: 13, color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: textController,
                      autofocus: true,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: 'Skills',
                        hintText: 'e.g. Basic Computer, Electrician, Driving, Tailoring',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final entered = textController.text
                        .split(',')
                        .map((s) => s.trim())
                        .where((s) => s.isNotEmpty)
                        .toList();

                    final matchedEnums = <String>[];
                    final customList = <String>[];

                    for (final item in entered) {
                      String? foundKey;
                      for (final entry in _skillOptions.entries) {
                        if (entry.key.toLowerCase() == item.toLowerCase() ||
                            entry.value.toLowerCase() == item.toLowerCase()) {
                          foundKey = entry.key;
                          break;
                        }
                      }
                      if (foundKey != null) {
                        if (!matchedEnums.contains(foundKey)) matchedEnums.add(foundKey);
                      } else {
                        if (!customList.contains(item)) customList.add(item);
                      }
                    }

                    Navigator.pop(dialogContext);
                    _updateProfileField({
                      'skills': matchedEnums,
                      'other_skills': customList,
                    });
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _selectInterests() {
    final currentInterests = List<String>.from(_profileData?['aboutYou']?['interests'] ?? []);
    final currentOther = List<String>.from(_profileData?['aboutYou']?['other_interests'] ?? []);

    final initialList = <String>[];
    for (final i in currentInterests) {
      initialList.add(_interestOptions[i] ?? i);
    }
    for (final i in currentOther) {
      if (i.isNotEmpty && !initialList.contains(i)) {
        initialList.add(i);
      }
    }

    final textController = TextEditingController(text: initialList.join(', '));

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Interests'),
              content: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Write your interests separated by commas:',
                      style: TextStyle(fontSize: 13, color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: textController,
                      autofocus: true,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: 'Interests',
                        hintText: 'e.g. Technology, Handicrafts, Healthcare, Agriculture',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final entered = textController.text
                        .split(',')
                        .map((s) => s.trim())
                        .where((s) => s.isNotEmpty)
                        .toList();

                    final matchedEnums = <String>[];
                    final customList = <String>[];

                    for (final item in entered) {
                      String? foundKey;
                      for (final entry in _interestOptions.entries) {
                        if (entry.key.toLowerCase() == item.toLowerCase() ||
                            entry.value.toLowerCase() == item.toLowerCase()) {
                          foundKey = entry.key;
                          break;
                        }
                      }
                      if (foundKey != null) {
                        if (!matchedEnums.contains(foundKey)) matchedEnums.add(foundKey);
                      } else {
                        if (!customList.contains(item)) customList.add(item);
                      }
                    }

                    Navigator.pop(dialogContext);
                    _updateProfileField({
                      'interests': matchedEnums,
                      'other_interests': customList,
                    });
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _selectLocation() {
    final rawLoc = _profileData?['aboutYou']?['location'];
    final loc = (rawLoc is Map) ? Map<String, dynamic>.from(rawLoc) : <String, dynamic>{};

    final pincodeController = TextEditingController(text: loc['pincode']?.toString() ?? '');
    final villageController = TextEditingController(text: loc['village']?.toString() ?? '');
    final blockController = TextEditingController(text: loc['block']?.toString() ?? '');
    final districtController = TextEditingController(text: loc['district']?.toString() ?? '');
    final stateController = TextEditingController(text: loc['state']?.toString() ?? 'Bihar');

    final rawCoords = loc['coordinates'];
    Map<String, dynamic>? coordinates = rawCoords is Map ? Map<String, dynamic>.from(rawCoords) : null;
    bool isLookingUp = false;
    String? lookupMessage;
    bool lookupSuccess = false;
    String? validationError;

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Location'),
              content: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420, maxHeight: 520),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'You can fill your address manually or enter a 6-digit PIN code to auto-fill:',
                        style: TextStyle(fontSize: 13, color: Colors.black54),
                      ),
                      const SizedBox(height: 14),

                      // PIN Code Field with optional auto-fill action
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: TextField(
                              controller: pincodeController,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              decoration: InputDecoration(
                                labelText: 'PIN Code',
                                hintText: 'e.g. 800001',
                                counterText: '',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                prefixIcon: const Icon(Icons.pin_drop_outlined, size: 20),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            height: 48,
                            child: ElevatedButton.icon(
                              onPressed: isLookingUp
                                  ? null
                                  : () async {
                                      final pin = pincodeController.text.trim();
                                      if (pin.length != 6 || !RegExp(r'^[1-9][0-9]{5}$').hasMatch(pin)) {
                                        setDialogState(() {
                                          lookupMessage = 'Enter 6 digits';
                                          lookupSuccess = false;
                                        });
                                        return;
                                      }

                                      setDialogState(() {
                                        isLookingUp = true;
                                        lookupMessage = null;
                                      });

                                      try {
                                        final res = await ApiService.instance.lookupPincode(pin);
                                        setDialogState(() {
                                          isLookingUp = false;
                                          lookupSuccess = true;
                                          lookupMessage = 'Auto-filled!';
                                          if (res['district'] != null) {
                                            districtController.text = res['district'].toString();
                                          }
                                          if (res['state'] != null) {
                                            stateController.text = res['state'].toString();
                                          }
                                          if (res['block'] != null) {
                                            blockController.text = res['block'].toString();
                                          }
                                          if (res['village'] != null && villageController.text.isEmpty) {
                                            villageController.text = res['village'].toString();
                                          }
                                          if (res['coordinates'] is Map) {
                                            coordinates = Map<String, dynamic>.from(res['coordinates'] as Map);
                                          }
                                        });
                                      } catch (e) {
                                        setDialogState(() {
                                          isLookingUp = false;
                                          lookupSuccess = false;
                                          lookupMessage = 'Not found, fill manually';
                                        });
                                      }
                                    },
                              icon: isLookingUp
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : const Icon(Icons.auto_fix_high, size: 16),
                              label: const Text('Auto-fill', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                        ],
                      ),

                      if (lookupMessage != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          lookupMessage!,
                          style: TextStyle(
                            fontSize: 12,
                            color: lookupSuccess ? Colors.green[700] : Colors.orange[800],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],

                      const SizedBox(height: 12),

                      // Village / Post Office
                      TextField(
                        controller: villageController,
                        decoration: InputDecoration(
                          labelText: 'Village / Post Office / Locality',
                          hintText: 'e.g. Danapur, Mithapur',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          prefixIcon: const Icon(Icons.home_outlined, size: 20),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Block / Taluk
                      TextField(
                        controller: blockController,
                        decoration: InputDecoration(
                          labelText: 'Block / Taluk',
                          hintText: 'e.g. Phulwari, Patna Sadar',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          prefixIcon: const Icon(Icons.location_city_outlined, size: 20),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // District *
                      TextField(
                        controller: districtController,
                        decoration: InputDecoration(
                          labelText: 'District *',
                          hintText: 'e.g. Patna, Gaya, Muzaffarpur',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          prefixIcon: const Icon(Icons.map_outlined, size: 20),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // State *
                      TextField(
                        controller: stateController,
                        decoration: InputDecoration(
                          labelText: 'State *',
                          hintText: 'e.g. Bihar',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          prefixIcon: const Icon(Icons.public_outlined, size: 20),
                        ),
                      ),
                      
                      if (validationError != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          validationError!,
                          style: TextStyle(color: Colors.red.shade800, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final dist = districtController.text.trim();
                    final st = stateController.text.trim();
                    final pin = pincodeController.text.trim();

                    if (dist.isEmpty) {
                      setDialogState(() {
                        validationError = 'District is required.';
                      });
                      return;
                    }

                    if (pin.isNotEmpty && !RegExp(r'^[1-9][0-9]{5}$').hasMatch(pin)) {
                      setDialogState(() {
                        validationError = 'Please enter a valid 6-digit PIN code.';
                      });
                      return;
                    }

                    Navigator.pop(dialogContext);

                    final locationPayload = <String, dynamic>{
                      'district': dist,
                      'state': st.isNotEmpty ? st : 'Bihar',
                      'village': villageController.text.trim(),
                      'block': blockController.text.trim(),
                    };
                    if (pin.isNotEmpty) {
                      locationPayload['pincode'] = pin;
                    }
                    if (coordinates != null) {
                      locationPayload['coordinates'] = coordinates;
                    }

                    _updateProfileField({'location': locationPayload});
                  },
                  child: const Text('Save Location'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _handleCompleteNextStep() {
    final missing = List<String>.from(_profileData?['progress']?['missingSections'] ?? []);
    if (missing.contains('education')) {
      _selectEducation();
    } else if (missing.contains('occupation')) {
      _selectOccupation();
    } else if (missing.contains('skills')) {
      _selectSkills();
    } else if (missing.contains('location')) {
      _selectLocation();
    } else if (missing.contains('interests')) {
      _selectInterests();
    } else if (missing.contains('workPreferences')) {
      _selectWorkPreference();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your profile is already complete!')),
      );
    }
  }

  void _selectWorkPreference() {
    final options = [
      'Skill Training',
      'Enterprise / Self-Employment',
      'Local Wage Employment',
      'Apprenticeship',
    ];
    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('What kind of work do you prefer?'),
        children: options.map((opt) {
          return SimpleDialogOption(
            onPressed: () {
              Navigator.pop(context);
              _updateProfileField({
                'workPreferences': {'workTypePreference': opt},
              });
            },
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            child: Text(opt, style: const TextStyle(fontSize: 15)),
          );
        }).toList(),
      ),
    );
  }

  void _selectTravelDistance() {
    final options = [
      {'label': 'Within Village / Walking distance (up to 5 km)', 'preference': 'Within Village', 'km': 5},
      {'label': 'Nearby Town / Block (up to 15 km)', 'preference': 'Nearby Town', 'km': 15},
      {'label': 'Within District (up to 35 km)', 'preference': 'Within District', 'km': 35},
      {'label': 'Anywhere in State / Willing to relocate (up to 100 km)', 'preference': 'Within State', 'km': 100},
    ];
    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('How far can you travel?'),
        children: options.map((opt) {
          return SimpleDialogOption(
            onPressed: () {
              Navigator.pop(context);
              _updateProfileField({
                'workPreferences': {
                  'travelPreference': opt['preference'],
                  'mobility_radius_km': opt['km'],
                },
              });
            },
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            child: Text(opt['label'] as String, style: const TextStyle(fontSize: 15)),
          );
        }).toList(),
      ),
    );
  }

  int _getCompletionPercentage() {
    return _profileData?['progress']?['completionPercentage'] ?? 20;
  }

  // --- Widgets ---

  Widget _buildLoggedOutHeader(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.10),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.person_outline_rounded,
            size: 48,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Profile',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          'Please log in or register to access your profile, track your journey, and view personalized opportunities.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.5,
              ),
        ),
      ],
    );
  }

  Widget _buildProfileHeader(BuildContext context) {
    final userName = _profileData?['user']?['name'];
    final userEmail = _profileData?['user']?['email'];

    return Column(
      children: [
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.10),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.person_rounded,
            size: 48,
            color: AppColors.primary,
          ),
        ),

        const SizedBox(height: 14),

        Text(
          _isLoggedIn && userName != null ? userName : 'Your Profile',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),

        const SizedBox(height: 6),

        Text(
          _isLoggedIn && userEmail != null
              ? userEmail
              : 'Add some information about yourself to get better recommendations.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.5,
              ),
        ),
      ],
    );
  }

  Widget _buildAuthPromptCard(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.lock_outline_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Account Access',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Log in to save and track your journey',
                      style: TextStyle(fontSize: 13, color: Colors.black54),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: ElevatedButton(
                    onPressed: () => _showAuthModal(initialIsRegister: false),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Log In', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: OutlinedButton(
                    onPressed: () => _showAuthModal(initialIsRegister: true),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Register', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildCompletionCard(BuildContext context) {
    final pct = _getCompletionPercentage();
    final progressFraction = pct / 100.0;
    final nextStep = _profileData?['progress']?['nextStep'] ??
        (pct >= 65
            ? 'Great progress! Complete remaining details for highest recommendation accuracy.'
            : 'A more complete profile will help Saathi suggest training and livelihood options that match you.');

    return InkWell(
      onTap: _handleCompleteNextStep,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.25), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.rocket_launch_outlined, color: AppColors.primary),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Complete your profile',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$pct%',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: progressFraction,
                minHeight: 8,
                backgroundColor: const Color(0xFFE0E0E0),
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              nextStep.toString(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    height: 1.4,
                  ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  'Complete next step',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.primary),
              ],
            ),
          ],
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
                  icon: Icons.school_outlined,
                  label: 'Training',
                  onTap: () {
                    context.push('/training');
                  },
                ),
              ),
              Expanded(
                child: _NavItem(
                  icon: Icons.person_rounded,
                  label: 'Profile',
                  selected: true,
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

// --- Authentication Modal Sheet ---

class _AuthBottomSheet extends StatefulWidget {
  final bool initialIsRegister;
  final VoidCallback onAuthSuccess;

  const _AuthBottomSheet({
    required this.initialIsRegister,
    required this.onAuthSuccess,
  });

  @override
  State<_AuthBottomSheet> createState() => _AuthBottomSheetState();
}

class _AuthBottomSheetState extends State<_AuthBottomSheet> {
  late bool _isRegister;
  bool _isLoading = false;
  String? _errorMessage;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _educationController = TextEditingController();
  final _pincodeController = TextEditingController();

  // Pincode autofill state
  bool _isPincodeLooking = false;
  bool _pincodeResolved = false;
  String? _pincodeError;
  Map<String, dynamic>? _resolvedLocation;

  @override
  void initState() {
    super.initState();
    _isRegister = widget.initialIsRegister;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _educationController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  /// Look up pincode via public API and autofill location fields
  Future<void> _lookupPincode() async {
    final pin = _pincodeController.text.trim();
    if (pin.length != 6 || !RegExp(r'^[1-9][0-9]{5}$').hasMatch(pin)) {
      setState(() {
        _pincodeError = 'Enter a valid 6-digit pincode';
        _pincodeResolved = false;
        _resolvedLocation = null;
      });
      return;
    }

    setState(() {
      _isPincodeLooking = true;
      _pincodeError = null;
    });

    try {
      final data = await ApiService.instance.lookupPincodePublic(pin);
      if (mounted) {
        setState(() {
          _resolvedLocation = data;
          _pincodeResolved = true;
          _isPincodeLooking = false;
          _pincodeError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _pincodeError = e.toString().replaceAll('Exception: ', '');
          _pincodeResolved = false;
          _resolvedLocation = null;
          _isPincodeLooking = false;
        });
      }
    }
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter both email and password.');
      return;
    }

    if (_isRegister && _nameController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Please enter your full name.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (_isRegister) {
        // Build location map from pincode autofill
        Map<String, dynamic>? locationData;
        if (_pincodeResolved && _resolvedLocation != null) {
          locationData = {
            'pincode': _resolvedLocation!['pincode'],
            'village': _resolvedLocation!['village'],
            'block': _resolvedLocation!['block'],
            'district': _resolvedLocation!['district'],
            'state': _resolvedLocation!['state'],
            if (_resolvedLocation!['coordinates'] != null)
              'coordinates': _resolvedLocation!['coordinates'],
          };
        }

        await ApiService.instance.register(
          name: _nameController.text.trim(),
          email: email,
          password: password,
          education: _educationController.text.trim().isNotEmpty
              ? _educationController.text.trim()
              : null,
          location: locationData,
        );
      } else {
        await ApiService.instance.login(email: email, password: password);
      }
      widget.onAuthSuccess();
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Widget _buildAutofilledField({
    required IconData icon,
    required String label,
    required String? value,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: value != null ? Colors.green.shade50 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: value != null ? Colors.green.shade300 : Colors.grey.shade300,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: value != null ? Colors.green.shade700 : Colors.grey),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value ?? '—',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: value != null ? Colors.black87 : Colors.grey,
                  ),
                ),
              ],
            ),
          ),
          if (value != null)
            Icon(Icons.check_circle_rounded, size: 18, color: Colors.green.shade600),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _isRegister ? 'Create Account' : 'Welcome Back',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              _isRegister
                  ? 'Enter basic information to start your livelihood journey.'
                  : 'Enter your credentials to access your saved profile.',
              style: const TextStyle(fontSize: 14, color: Colors.black54),
            ),
            const SizedBox(height: 20),

            // Tab switch
            Container(
              height: 48,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() {
                        _isRegister = false;
                        _errorMessage = null;
                      }),
                      child: Container(
                        decoration: BoxDecoration(
                          color: !_isRegister ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: !_isRegister
                              ? [const BoxShadow(color: Colors.black12, blurRadius: 4)]
                              : null,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'Log In',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: !_isRegister ? AppColors.primary : Colors.black54,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() {
                        _isRegister = true;
                        _errorMessage = null;
                      }),
                      child: Container(
                        decoration: BoxDecoration(
                          color: _isRegister ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: _isRegister
                              ? [const BoxShadow(color: Colors.black12, blurRadius: 4)]
                              : null,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'Register',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _isRegister ? AppColors.primary : Colors.black54,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            if (_errorMessage != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(
                  _errorMessage!,
                  style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                ),
              ),

            if (_isRegister) ...[
              TextField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Full Name *',
                  prefixIcon: const Icon(Icons.person_outline_rounded),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _educationController,
                decoration: InputDecoration(
                  labelText: 'Highest Education (e.g. 10th Pass, 12th Pass)',
                  prefixIcon: const Icon(Icons.school_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),

              // --- Pincode field with auto-lookup ---
              TextField(
                controller: _pincodeController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: InputDecoration(
                  labelText: 'Pincode *',
                  hintText: 'e.g. 800001',
                  prefixIcon: const Icon(Icons.pin_drop_outlined),
                  counterText: '',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  suffixIcon: _isPincodeLooking
                      ? const Padding(
                          padding: EdgeInsets.all(14),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : IconButton(
                          onPressed: _lookupPincode,
                          icon: Icon(
                            _pincodeResolved
                                ? Icons.check_circle_rounded
                                : Icons.search_rounded,
                            color: _pincodeResolved ? Colors.green : null,
                          ),
                          tooltip: 'Lookup Pincode',
                        ),
                  errorText: _pincodeError,
                ),
                onChanged: (val) {
                  // Auto-lookup when user types 6 digits
                  if (val.trim().length == 6 && RegExp(r'^[1-9][0-9]{5}$').hasMatch(val.trim())) {
                    _lookupPincode();
                  } else {
                    if (_pincodeResolved) {
                      setState(() {
                        _pincodeResolved = false;
                        _resolvedLocation = null;
                        _pincodeError = null;
                      });
                    }
                  }
                },
              ),

              // Show autofilled location fields when pincode is resolved
              if (_pincodeResolved && _resolvedLocation != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.auto_fix_high_rounded, size: 16, color: Colors.green.shade700),
                          const SizedBox(width: 6),
                          Text(
                            'Location auto-filled from pincode',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.green.shade700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _buildAutofilledField(
                        icon: Icons.holiday_village_outlined,
                        label: 'Village / Area',
                        value: _resolvedLocation!['village'] as String?,
                      ),
                      const SizedBox(height: 8),
                      _buildAutofilledField(
                        icon: Icons.location_city_outlined,
                        label: 'District',
                        value: _resolvedLocation!['district'] as String?,
                      ),
                      const SizedBox(height: 8),
                      _buildAutofilledField(
                        icon: Icons.map_outlined,
                        label: 'State',
                        value: _resolvedLocation!['state'] as String?,
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 16),
            ],

            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Email Address',
                prefixIcon: const Icon(Icons.email_outlined),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),

            const SizedBox(height: 16),

            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),

            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : Text(
                        _isRegister ? 'Create Account' : 'Log In',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  const _ProfileItem({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary, size: 23),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              Icon(
                Icons.chevron_right_rounded,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PreferenceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  const _PreferenceCard({
    required this.icon,
    required this.title,
    required this.value,
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
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 25),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              const Icon(Icons.chevron_right_rounded),
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
