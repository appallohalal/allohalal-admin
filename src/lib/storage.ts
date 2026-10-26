'use client';

import { Product, Additive, UserAccount, GeoAd, GroqApiLog, HalalStatus, AdMobSettings, GroqSettings } from './types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  PRODUCTS: 'halallens_supabase_products',
  ADDITIVES: 'halallens_supabase_additives',
  USERS: 'halallens_supabase_users',
  ADS: 'halallens_supabase_ads',
  LOGS: 'halallens_supabase_logs',
  ADMOB: 'halallens_supabase_admob',
  GROQ_SETTINGS: 'halallens_supabase_groq_settings',
};

// ==========================================
// 1. PRODUCTS (Supabase integration)
// ==========================================

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: Product[] = data.map((item: any) => ({
        id: item.id,
        barcode: item.barcode,
        name: item.name,
        brand: item.brand || '',
        imageUrl: item.image_url,
        ingredientsRaw: item.ingredients_raw || '',
        detectedAdditives: item.detected_additives || [],
        aiStatus: item.ai_status || 'MUSHBOOH',
        manualStatus: item.manual_status,
        isOverridden: item.is_overridden || false,
        moderatorNote: item.moderator_note,
        verifiedBy: item.verified_by,
        scansCount: item.scans_count || 0,
        lastScannedAt: item.updated_at || item.created_at,
        createdAt: item.created_at,
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase products fetch note:', err);
  }

  // Fallback to local storage (initialized empty)
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return [];
};

export const updateProductStatus = async (
  productId: string,
  newStatus: HalalStatus,
  moderatorNote: string,
  verifiedBy: string = 'Admin'
): Promise<Product[]> => {
  try {
    await supabase
      .from('products')
      .update({
        manual_status: newStatus,
        is_overridden: true,
        moderator_note: moderatorNote,
        verified_by: verifiedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);
  } catch (err) {
    console.warn('Supabase update note:', err);
  }

  return fetchProducts();
};

// ==========================================
// 2. ADDITIVES (Supabase integration)
// ==========================================

export const fetchAdditives = async (): Promise<Additive[]> => {
  try {
    const { data, error } = await supabase
      .from('additives')
      .select('*')
      .order('code', { ascending: true });

    if (!error && data) {
      const mapped: Additive[] = data.map((item: any) => ({
        id: item.id,
        code: item.code,
        nameEn: item.name_en,
        status: item.status || 'MUSHBOOH',
        source: item.source || 'Doubtful',
        category: item.category || '',
        translations: item.translations || {},
        updatedAt: item.updated_at || item.created_at,
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ADDITIVES, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase additives fetch note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.ADDITIVES);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return [];
};

export const saveAdditive = async (additive: Additive): Promise<Additive[]> => {
  try {
    await supabase.from('additives').upsert({
      id: additive.id,
      code: additive.code,
      name_en: additive.nameEn,
      status: additive.status,
      source: additive.source,
      category: additive.category,
      translations: additive.translations,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase save additive note:', err);
  }

  return fetchAdditives();
};

export const deleteAdditive = async (id: string): Promise<Additive[]> => {
  try {
    await supabase.from('additives').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase delete additive note:', err);
  }

  return fetchAdditives();
};

// ==========================================
// 3. USERS (Supabase integration)
// ==========================================

export const fetchUsers = async (): Promise<UserAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: UserAccount[] = data.map((item: any) => ({
        id: item.id,
        deviceId: item.device_id,
        email: item.email,
        name: item.name,
        country: item.country || 'Unknown',
        isPremium: item.is_premium || false,
        isBanned: item.is_banned || false,
        banReason: item.ban_reason,
        totalScans: item.total_scans || 0,
        lastActiveAt: item.last_active_at || item.created_at,
        createdAt: item.created_at,
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase users fetch note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.USERS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return [];
};

export const toggleUserBan = async (userId: string, reason?: string): Promise<UserAccount[]> => {
  const users = await fetchUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    const newBannedState = !target.isBanned;
    try {
      await supabase
        .from('users')
        .update({
          is_banned: newBannedState,
          ban_reason: newBannedState ? (reason || 'Violation of terms') : null,
        })
        .eq('id', userId);
    } catch (err) {
      console.warn('Supabase toggle ban note:', err);
    }
  }

  return fetchUsers();
};

export const toggleUserPremium = async (userId: string): Promise<UserAccount[]> => {
  const users = await fetchUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    try {
      await supabase
        .from('users')
        .update({
          is_premium: !target.isPremium,
        })
        .eq('id', userId);
    } catch (err) {
      console.warn('Supabase toggle premium note:', err);
    }
  }

  return fetchUsers();
};

// ==========================================
// 4. GEO ADS (Supabase integration)
// ==========================================

export const fetchAds = async (): Promise<GeoAd[]> => {
  try {
    const { data, error } = await supabase
      .from('geo_ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: GeoAd[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        sponsorName: item.sponsor_name,
        bannerImageUrl: item.banner_image_url,
        targetUrl: item.target_url,
        latitude: item.latitude,
        longitude: item.longitude,
        radiusKm: item.radius_km || 15.0,
        locationName: item.location_name || '',
        isActive: item.is_active !== false,
        impressionCount: item.impression_count || 0,
        clickCount: item.click_count || 0,
        startDate: item.start_date || item.created_at,
        endDate: item.end_date,
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ADS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase ads fetch note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.ADS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return [];
};

export const saveGeoAd = async (ad: GeoAd): Promise<GeoAd[]> => {
  try {
    await supabase.from('geo_ads').upsert({
      id: ad.id,
      title: ad.title,
      sponsor_name: ad.sponsorName,
      banner_image_url: ad.bannerImageUrl,
      target_url: ad.targetUrl,
      latitude: ad.latitude,
      longitude: ad.longitude,
      radius_km: ad.radiusKm,
      location_name: ad.locationName,
      is_active: ad.isActive,
      impression_count: ad.impressionCount,
      click_count: ad.clickCount,
    });
  } catch (err) {
    console.warn('Supabase save ad note:', err);
  }

  return fetchAds();
};

export const toggleAdActive = async (adId: string): Promise<GeoAd[]> => {
  const ads = await fetchAds();
  const target = ads.find((a) => a.id === adId);
  if (target) {
    try {
      await supabase
        .from('geo_ads')
        .update({
          is_active: !target.isActive,
        })
        .eq('id', adId);
    } catch (err) {
      console.warn('Supabase toggle ad active note:', err);
    }
  }

  return fetchAds();
};

// ==========================================
// 5. GROQ API LOGS (Supabase integration)
// ==========================================

export const fetchLogs = async (): Promise<GroqApiLog[]> => {
  try {
    const { data, error } = await supabase
      .from('groq_api_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      const mapped: GroqApiLog[] = data.map((item: any) => ({
        id: item.id,
        timestamp: item.created_at,
        endpoint: item.endpoint,
        model: item.model,
        barcode: item.barcode,
        promptTokens: item.prompt_tokens || 0,
        completionTokens: item.completion_tokens || 0,
        latencyMs: item.latency_ms || 0,
        statusCode: item.status_code || 200,
        status: item.status || 'SUCCESS',
        errorMessage: item.error_message,
        userDeviceId: item.user_device_id,
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase logs fetch note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return [];
};

// ==========================================
// 6. ADMOB REMOTE SETTINGS (Supabase integration)
// ==========================================

export const DEFAULT_ADMOB_SETTINGS: AdMobSettings = {
  id: 'global',
  adsEnabled: true,
  testMode: true,
  bannerEnabled: true,
  interstitialEnabled: true,
  appOpenEnabled: true,
  nativeEnabled: true,
  rewardedEnabled: false,
  interstitialIntervalScans: 3,
  appOpenCooldownMinutes: 15,
  bannerRefreshRateSeconds: 60,
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  androidBannerId: 'ca-app-pub-3940256099942544/6300978111',
  androidInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
  androidAppOpenId: 'ca-app-pub-3940256099942544/9257395921',
  androidNativeId: 'ca-app-pub-3940256099942544/2247696110',
  androidRewardedId: 'ca-app-pub-3940256099942544/5224354917',
  iosAppId: '',
  iosBannerId: '',
  iosInterstitialId: '',
  iosAppOpenId: '',
  iosNativeId: '',
  iosRewardedId: '',
  testAndroidAppId: 'ca-app-pub-3940256099942544~3347511713',
  testAndroidBannerId: 'ca-app-pub-3940256099942544/6300978111',
  testAndroidInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
  testAndroidAppOpenId: 'ca-app-pub-3940256099942544/9257395921',
  testAndroidNativeId: 'ca-app-pub-3940256099942544/2247696110',
  testAndroidRewardedId: 'ca-app-pub-3940256099942544/5224354917',
  testIosAppId: 'ca-app-pub-3940256099942544~1458002511',
  testIosBannerId: 'ca-app-pub-3940256099942544/2934735716',
  testIosInterstitialId: 'ca-app-pub-3940256099942544/4411468910',
  testIosAppOpenId: 'ca-app-pub-3940256099942544/5575463023',
  testIosNativeId: 'ca-app-pub-3940256099942544/3986624511',
  testIosRewardedId: 'ca-app-pub-3940256099942544/1712485313',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin',
};

export const fetchAdMobSettings = async (): Promise<AdMobSettings> => {
  try {
    const { data, error } = await supabase
      .from('admob_settings')
      .select('*')
      .eq('id', 'global')
      .single();

    if (!error && data) {
      const mapped: AdMobSettings = {
        id: data.id,
        adsEnabled: data.ads_enabled ?? true,
        testMode: data.test_mode ?? true,
        bannerEnabled: data.banner_enabled ?? true,
        interstitialEnabled: data.interstitial_enabled ?? true,
        appOpenEnabled: data.app_open_enabled ?? true,
        nativeEnabled: data.native_enabled ?? true,
        rewardedEnabled: data.rewarded_enabled ?? false,
        interstitialIntervalScans: data.interstitial_interval_scans ?? 3,
        appOpenCooldownMinutes: data.app_open_cooldown_minutes ?? 15,
        bannerRefreshRateSeconds: data.banner_refresh_rate_seconds ?? 60,
        androidAppId: data.android_app_id || data.test_android_app_id || DEFAULT_ADMOB_SETTINGS.androidAppId,
        androidBannerId: data.android_banner_id || data.test_android_banner_id || DEFAULT_ADMOB_SETTINGS.androidBannerId,
        androidInterstitialId: data.android_interstitial_id || data.test_android_interstitial_id || DEFAULT_ADMOB_SETTINGS.androidInterstitialId,
        androidAppOpenId: data.android_app_open_id || data.test_android_app_open_id || DEFAULT_ADMOB_SETTINGS.androidAppOpenId,
        androidNativeId: data.android_native_id || data.test_android_native_id || DEFAULT_ADMOB_SETTINGS.androidNativeId,
        androidRewardedId: data.android_rewarded_id || data.test_android_rewarded_id || DEFAULT_ADMOB_SETTINGS.androidRewardedId,
        iosAppId: data.ios_app_id || '',
        iosBannerId: data.ios_banner_id || '',
        iosInterstitialId: data.ios_interstitial_id || '',
        iosAppOpenId: data.ios_app_open_id || '',
        iosNativeId: data.ios_native_id || '',
        iosRewardedId: data.ios_rewarded_id || '',
        testAndroidAppId: data.test_android_app_id || DEFAULT_ADMOB_SETTINGS.testAndroidAppId,
        testAndroidBannerId: data.test_android_banner_id || DEFAULT_ADMOB_SETTINGS.testAndroidBannerId,
        testAndroidInterstitialId: data.test_android_interstitial_id || DEFAULT_ADMOB_SETTINGS.testAndroidInterstitialId,
        testAndroidAppOpenId: data.test_android_app_open_id || DEFAULT_ADMOB_SETTINGS.testAndroidAppOpenId,
        testAndroidNativeId: data.test_android_native_id || DEFAULT_ADMOB_SETTINGS.testAndroidNativeId,
        testAndroidRewardedId: data.test_android_rewarded_id || DEFAULT_ADMOB_SETTINGS.testAndroidRewardedId,
        testIosAppId: data.test_ios_app_id || DEFAULT_ADMOB_SETTINGS.testIosAppId,
        testIosBannerId: data.test_ios_banner_id || DEFAULT_ADMOB_SETTINGS.testIosBannerId,
        testIosInterstitialId: data.test_ios_interstitial_id || DEFAULT_ADMOB_SETTINGS.testIosInterstitialId,
        testIosAppOpenId: data.test_ios_app_open_id || DEFAULT_ADMOB_SETTINGS.testIosAppOpenId,
        testIosNativeId: data.test_ios_native_id || DEFAULT_ADMOB_SETTINGS.testIosNativeId,
        testIosRewardedId: data.test_ios_rewarded_id || DEFAULT_ADMOB_SETTINGS.testIosRewardedId,
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || 'Admin',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ADMOB, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase fetch AdMob settings note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.ADMOB);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  return DEFAULT_ADMOB_SETTINGS;
};

export const saveAdMobSettings = async (settings: AdMobSettings, updatedBy: string = 'Admin'): Promise<AdMobSettings> => {
  const payload = {
    id: 'global',
    ads_enabled: settings.adsEnabled,
    test_mode: settings.testMode,
    banner_enabled: settings.bannerEnabled,
    interstitial_enabled: settings.interstitialEnabled,
    app_open_enabled: settings.appOpenEnabled,
    native_enabled: settings.nativeEnabled,
    rewarded_enabled: settings.rewardedEnabled,
    interstitial_interval_scans: settings.interstitialIntervalScans,
    app_open_cooldown_minutes: settings.appOpenCooldownMinutes,
    banner_refresh_rate_seconds: settings.bannerRefreshRateSeconds,
    android_app_id: settings.androidAppId.trim(),
    android_banner_id: settings.androidBannerId.trim(),
    android_interstitial_id: settings.androidInterstitialId.trim(),
    android_app_open_id: settings.androidAppOpenId.trim(),
    android_native_id: settings.androidNativeId.trim(),
    android_rewarded_id: settings.androidRewardedId.trim(),
    ios_app_id: settings.iosAppId.trim(),
    ios_banner_id: settings.iosBannerId.trim(),
    ios_interstitial_id: settings.iosInterstitialId.trim(),
    ios_app_open_id: settings.iosAppOpenId.trim(),
    ios_native_id: settings.iosNativeId.trim(),
    ios_rewarded_id: settings.iosRewardedId.trim(),
    test_android_app_id: settings.testAndroidAppId.trim(),
    test_android_banner_id: settings.testAndroidBannerId.trim(),
    test_android_interstitial_id: settings.testAndroidInterstitialId.trim(),
    test_android_app_open_id: settings.testAndroidAppOpenId.trim(),
    test_android_native_id: settings.testAndroidNativeId.trim(),
    test_android_rewarded_id: settings.testAndroidRewardedId.trim(),
    test_ios_app_id: settings.testIosAppId.trim(),
    test_ios_banner_id: settings.testIosBannerId.trim(),
    test_ios_interstitial_id: settings.testIosInterstitialId.trim(),
    test_ios_app_open_id: settings.testIosAppOpenId.trim(),
    test_ios_native_id: settings.testIosNativeId.trim(),
    test_ios_rewarded_id: settings.testIosRewardedId.trim(),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  try {
    const { error } = await supabase.from('admob_settings').upsert(payload);
    if (error) {
      console.error('Error saving AdMob settings to Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.warn('Supabase save AdMob settings warning:', err);
  }

  if (typeof window !== 'undefined') {
    const updated: AdMobSettings = {
      ...settings,
      updatedAt: payload.updated_at,
      updatedBy,
    };
    localStorage.setItem(STORAGE_KEYS.ADMOB, JSON.stringify(updated));
  }

  return fetchAdMobSettings();
};

// ==========================================
// 7. GROQ AI REMOTE SETTINGS (Supabase integration)
// ==========================================

export const DEFAULT_GROQ_SETTINGS: GroqSettings = {
  id: 'global',
  apiKey: '',
  model: 'llama-3.3-70b-versatile',
  visionModel: 'llama-3.2-11b-vision-preview',
  isEnabled: true,
  temperature: 0.1,
  maxTokens: 2048,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin',
};

export const fetchGroqSettings = async (): Promise<GroqSettings> => {
  try {
    const { data, error } = await supabase
      .from('groq_settings')
      .select('*')
      .eq('id', 'global')
      .single();

    if (!error && data) {
      const mapped: GroqSettings = {
        id: data.id,
        apiKey: data.api_key || '',
        model: data.model || DEFAULT_GROQ_SETTINGS.model,
        visionModel: data.vision_model || DEFAULT_GROQ_SETTINGS.visionModel,
        isEnabled: data.is_enabled ?? true,
        temperature: data.temperature ?? 0.1,
        maxTokens: data.max_tokens ?? 2048,
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || 'Admin',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.GROQ_SETTINGS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase fetch Groq settings note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.GROQ_SETTINGS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
  }

  return DEFAULT_GROQ_SETTINGS;
};

export const saveGroqSettings = async (
  settings: GroqSettings,
  updatedBy: string = 'Admin'
): Promise<GroqSettings> => {
  const payload = {
    id: 'global',
    api_key: settings.apiKey.trim(),
    model: settings.model.trim(),
    vision_model: settings.visionModel.trim(),
    is_enabled: settings.isEnabled,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  try {
    const { error } = await supabase.from('groq_settings').upsert(payload);
    if (error) {
      console.error('Error saving Groq settings to Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.warn('Supabase save Groq settings warning:', err);
  }

  if (typeof window !== 'undefined') {
    const updated: GroqSettings = {
      ...settings,
      updatedAt: payload.updated_at,
      updatedBy,
    };
    localStorage.setItem(STORAGE_KEYS.GROQ_SETTINGS, JSON.stringify(updated));
  }

  return fetchGroqSettings();
};

