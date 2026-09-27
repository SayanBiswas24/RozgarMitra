import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  static const String _tokenKey = 'auth_access_token';
  static const String _userKey = 'auth_user_data';

  String get baseUrl {
    // If running on Android emulator, localhost is mapped to 10.0.2.2
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000/api';
    }
    return AppConstants.apiBaseUrl;
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString(_userKey);
    if (userStr != null) {
      try {
        return jsonDecode(userStr) as Map<String, dynamic>;
      } catch (_) {}
    }
    return null;
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> _saveSession(String token, Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  // --- Auth APIs ---

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? education,
    String? district,
    Map<String, dynamic>? location,
  }) async {
    final url = Uri.parse('$baseUrl/auth/register');
    final payload = <String, dynamic>{
      'name': name,
      'email': email,
      'password': password,
    };
    if (education != null && education.trim().isNotEmpty) {
      payload['education'] = education.trim();
    }
    // Send full location from pincode autofill
    if (location != null && location.isNotEmpty) {
      payload['profile'] = {
        'location': location,
      };
    } else if (district != null && district.trim().isNotEmpty) {
      payload['district'] = district.trim();
    }

    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 201 && data['success'] == true) {
      final token = data['data']['tokens']['accessToken'] as String;
      final user = data['data']['user'] as Map<String, dynamic>;
      await _saveSession(token, user);
      return data;
    } else {
      throw Exception(data['message'] ?? 'Registration failed');
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final url = Uri.parse('$baseUrl/auth/login');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      final token = data['data']['tokens']['accessToken'] as String;
      final user = data['data']['user'] as Map<String, dynamic>;
      await _saveSession(token, user);
      return data;
    } else {
      throw Exception(data['message'] ?? 'Login failed');
    }
  }

  Future<void> logout() async {
    try {
      final token = await getToken();
      if (token != null) {
        final url = Uri.parse('$baseUrl/auth/logout');
        await http.post(
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );
      }
    } catch (_) {}
    await clearSession();
  }

  // --- Profile APIs ---

  Future<Map<String, dynamic>> getProfile() async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Not logged in');
    }

    final url = Uri.parse('$baseUrl/profile');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Failed to load profile');
    }
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> updateFields) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Not logged in');
    }

    final url = Uri.parse('$baseUrl/profile');
    final response = await http.patch(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(updateFields),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Failed to update profile');
    }
  }

  Future<Map<String, dynamic>> getProgress() async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Not logged in');
    }

    final url = Uri.parse('$baseUrl/profile/progress');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Failed to load progress');
    }
  }

  Future<Map<String, dynamic>> getRecommendations() async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Not logged in');
    }

    final url = Uri.parse('$baseUrl/recommendations');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Failed to load recommendations');
    }
  }

  Future<Map<String, dynamic>> lookupPincode(String pincode) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Not logged in');
    }

    final cleanPin = pincode.trim();
    final url = Uri.parse('$baseUrl/profile/pincode/$cleanPin');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Pincode not found or lookup failed');
    }
  }

  /// Public pincode lookup (no auth required) for use during registration
  Future<Map<String, dynamic>> lookupPincodePublic(String pincode) async {
    final cleanPin = pincode.trim();
    final url = Uri.parse('$baseUrl/auth/pincode/$cleanPin');
    final response = await http.get(
      url,
      headers: {'Content-Type': 'application/json'},
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Pincode not found or lookup failed');
    }
  }

  // --- Training APIs ---

  Future<List<String>> getTrainingCategories() async {
    try {
      final url = Uri.parse('$baseUrl/training/categories');
      final response = await http.get(url, headers: {'Content-Type': 'application/json'});
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode == 200 && data['success'] == true) {
        final list = (data['data']['categories'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList();
        return list ?? ['All'];
      }
    } catch (_) {}
    return ['All'];
  }

  Future<Map<String, dynamic>> getTrainingOpportunities({
    int page = 1,
    int limit = 20,
    String? search,
    String? category,
    String? mode,
    String? district,
    String? state,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (category != null && category.trim().isNotEmpty && category != 'All') {
      queryParams['category'] = category.trim();
    }
    if (mode != null && mode.trim().isNotEmpty && mode != 'All') {
      queryParams['mode'] = mode.trim();
    }
    if (district != null && district.trim().isNotEmpty) {
      queryParams['district'] = district.trim();
    }
    if (state != null && state.trim().isNotEmpty) {
      queryParams['state'] = state.trim();
    }

    final uri = Uri.parse('$baseUrl/training/opportunities').replace(queryParameters: queryParams);
    final token = await getToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final response = await http.get(uri, headers: headers);
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Failed to load training opportunities');
    }
  }

  Future<Map<String, dynamic>> getTrainingOpportunityDetails(String id) async {
    final uri = Uri.parse('$baseUrl/training/$id');
    final token = await getToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final response = await http.get(uri, headers: headers);
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data']['opportunity'] as Map<String, dynamic>;
    } else {
      throw Exception(data['message'] ?? 'Failed to load training details');
    }
  }

  Future<List<Map<String, dynamic>>> getNearYouOpportunities({
    String? district,
    String? state,
    double? latitude,
    double? longitude,
    int limit = 3,
  }) async {
    try {
      final queryParams = <String, String>{
        'limit': limit.toString(),
      };
      if (district != null && district.trim().isNotEmpty) {
        queryParams['district'] = district.trim();
      }
      if (state != null && state.trim().isNotEmpty) {
        queryParams['state'] = state.trim();
      }
      if (latitude != null) {
        queryParams['latitude'] = latitude.toString();
      }
      if (longitude != null) {
        queryParams['longitude'] = longitude.toString();
      }

      final uri = Uri.parse('$baseUrl/training/near-you').replace(queryParameters: queryParams);
      final token = await getToken();
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.get(uri, headers: headers);
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode == 200 && data['success'] == true) {
        final list = data['data']['opportunities'] as List<dynamic>?;
        return list?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
      }
    } catch (_) {}
    return [];
  }
}

