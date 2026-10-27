# 📱 Flutter App Integration Guide with HalalLens Admin & Backend

This guide outlines how to connect your existing Flutter app (`scanner/lib`) to the Next.js / Supabase backend.

---

## 1. Environment Configuration

In your Flutter app (`scanner/lib/config/app_config.dart`), add your backend URL:

```dart
class AppConfig {
  // Local development (use your machine's LAN IP if testing on real physical device):
  static const String backendBaseUrl = 'http://localhost:3000/api/v1';
  
  // Production (e.g. deployed on Vercel):
  // static const String backendBaseUrl = 'https://admin.halallens.com/api/v1';
}
```

---

## 2. Barcode Scanning with Backend & Override Priority

Update `scanner/lib/services/api_service.dart` or your scan handler to check the backend first:

```dart
Future<HalalResult?> checkBarcodeWithBackend(String barcode, String deviceId) async {
  final uri = Uri.parse('${AppConfig.backendBaseUrl}/scan');
  
  final response = await http.post(
    uri,
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'barcode': barcode,
      'deviceId': deviceId,
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    
    // If a moderator has manually overridden or cached this item:
    if (data['found'] == true) {
      final p = data['product'];
      return HalalResult(
        status: p['status'] == 'HALAL' 
            ? HalalStatus.halal 
            : p['status'] == 'HARAM' 
                ? HalalStatus.haram 
                : HalalStatus.doubtful,
        reason: p['moderatorNote'] ?? 'Verified by HalalLens Certification Board',
        isCertified: p['isOverridden'] == true,
      );
    }
  }
  
  // Fallback to local Groq / OpenFoodFacts if not in backend cache
  return null;
}
```

---

## 3. Geo-Targeted Sponsored Banners (GPS Location)

Fetch local partner banners based on the user's current GPS coordinates:

```dart
Future<List<GeoAd>> fetchLocalAds({required double latitude, required double longitude}) async {
  final uri = Uri.parse('${AppConfig.backendBaseUrl}/ads?lat=$latitude&lng=$longitude');
  
  final response = await http.get(uri);
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    final List adsList = data['ads'] ?? [];
    return adsList.map((item) => GeoAd.fromJson(item)).toList();
  }
  return [];
}
```

---

## 4. 14-Language E-Numbers Offline Dictionary Sync

Sync the latest E-numbers dictionary during app launch or language switch:

```dart
Future<void> syncAdditivesDictionary(String languageCode) async {
  final uri = Uri.parse('${AppConfig.backendBaseUrl}/additives?lang=$languageCode');
  
  final response = await http.get(uri);
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    // Cache into local Hive database for instant offline checking
    final box = Hive.box('additives_cache');
    await box.put('additives_$languageCode', data['additives']);
  }
}
```

---

## 5. Google AdMob Dynamic Remote Configuration Sync

Instead of hardcoding AdMob IDs or recompiling the app to disable ads, sync the live configuration from the backend at startup:

```dart
// Fetch live remote config from admin panel
Future<void> syncRemoteAdMobConfig() async {
  final platform = Platform.isAndroid ? 'android' : 'ios';
  final uri = Uri.parse('${AppConfig.backendBaseUrl}/admob?platform=$platform');

  try {
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      // 1. Master enable/disable switch
      AdConfig.adsEnabled = data['adsEnabled'] ?? false;
      
      // 2. Active IDs (Automatically selects between Test IDs and Production IDs based on Admin toggle)
      final activeIds = data['activeIds'] ?? {};
      AdConfig.activeBannerId = activeIds['bannerId'] ?? '';
      AdConfig.activeInterstitialId = activeIds['interstitialId'] ?? '';
      AdConfig.activeAppOpenId = activeIds['appOpenId'] ?? '';
      AdConfig.activeNativeId = activeIds['nativeId'] ?? '';

      // 3. Frequency & Format controls
      final formats = data['formats'] ?? {};
      AdConfig.bannerEnabled = formats['banner'] ?? true;
      AdConfig.interstitialEnabled = formats['interstitial'] ?? true;
      AdConfig.appOpenEnabled = formats['appOpen'] ?? true;

      final freq = data['frequency'] ?? {};
      AdConfig.interstitialScanInterval = freq['interstitialIntervalScans'] ?? 3;
    }
  } catch (e) {
    debugPrint('AdMob remote sync failed, using fallback: $e');
  }
```

---

## 6. Mandatory Account Creation / Force User Authentication Remote Feature Toggle

Control whether mobile users can scan freely without an account (V1 default: optional) or are required to log in / register.

### Remote Endpoints:
- `GET /api/v1/auth/config`: Returns `{ forceUserAuth: boolean, allowGuestScan: boolean }`
- `POST /api/v1/auth/config`: Toggles the policy in real-time from the Admin Panel
- `POST /api/v1/auth/mobile/register`: Accepts Name, Username, Email, Password, Country, City
- `POST /api/v1/auth/mobile/login`: Authenticates with Email & Password

### Mobile App Integration (`scanner/lib/config/auth_config.dart` & `services/auth_service.dart`):
```dart
// 1. Sync remote feature toggle on app launch:
await AuthConfig.syncFromBackend();

// 2. Check if authentication is required before scanning:
if (AuthConfig.isForceUserAuth && !AuthService.instance.isLoggedIn) {
  // Direct user to AuthScreen
}
```

