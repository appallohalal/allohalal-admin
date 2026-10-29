'use client';

import { Product, Additive, UserAccount, GeoAd, GroqApiLog, HalalStatus, AdMobSettings, GroqSettings, AuthSettings, PushNotification, NotificationSettings } from './types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  PRODUCTS: 'halallens_supabase_products',
  ADDITIVES: 'halallens_supabase_additives',
  USERS: 'halallens_supabase_users',
  ADS: 'halallens_supabase_ads',
  LOGS: 'halallens_supabase_logs',
  ADMOB: 'halallens_supabase_admob',
  GROQ_SETTINGS: 'halallens_supabase_groq_settings',
  AUTH_SETTINGS: 'halallens_supabase_auth_settings',
  NOTIFICATIONS: 'halallens_supabase_notifications',
  NOTIFICATION_SETTINGS: 'halallens_supabase_notification_settings',
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

export const saveProduct = async (product: Product): Promise<Product[]> => {
  try {
    const payload: Record<string, any> = {
      barcode: product.barcode,
      name: product.name,
      brand: product.brand || '',
      image_url: product.imageUrl || null,
      ingredients_raw: product.ingredientsRaw || '',
      detected_additives: product.detectedAdditives || [],
      ai_status: product.aiStatus || 'HALAL',
      manual_status: product.manualStatus || product.aiStatus || 'HALAL',
      is_overridden: product.isOverridden ?? true,
      moderator_note: product.moderatorNote || '',
      verified_by: product.verifiedBy || 'Admin',
      scans_count: product.scansCount || 0,
      updated_at: new Date().toISOString(),
    };

    if (product.id && !product.id.startsWith('prod-')) {
      payload.id = product.id;
      await supabase.from('products').upsert(payload);
    } else {
      // Check if a product with this barcode already exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', product.barcode)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('products').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('products').insert(payload);
      }
    }
  } catch (err) {
    console.warn('Supabase save product note:', err);
  }

  return fetchProducts();
};

export const deleteProduct = async (productId: string): Promise<Product[]> => {
  try {
    await supabase.from('products').delete().eq('id', productId);
  } catch (err) {
    console.warn('Supabase delete product note:', err);
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
    const payload: Record<string, any> = {
      code: additive.code,
      name_en: additive.nameEn,
      status: additive.status,
      source: additive.source,
      category: additive.category,
      translations: additive.translations,
      updated_at: new Date().toISOString(),
    };

    if (additive.id && !additive.id.startsWith('add-')) {
      payload.id = additive.id;
      await supabase.from('additives').upsert(payload);
    } else {
      const { data: existing } = await supabase
        .from('additives')
        .select('id')
        .eq('code', additive.code)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('additives').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('additives').insert(payload);
      }
    }
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
        username: item.username,
        country: item.country || 'Unknown',
        city: item.city || '',
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
          ban_reason: newBannedState ? (reason?.trim() || 'Terms of Service & Community Guidelines violation') : null,
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
    const payload: Record<string, any> = {
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
    };
    if (ad.id && !ad.id.startsWith('ad-')) {
      payload.id = ad.id;
    }
    await supabase.from('geo_ads').upsert(payload);
  } catch (err) {
    console.warn('Supabase save ad note:', err);
  }

  return fetchAds();
};

export const deleteGeoAd = async (adId: string): Promise<GeoAd[]> => {
  try {
    await supabase.from('geo_ads').delete().eq('id', adId);
  } catch (err) {
    console.warn('Supabase delete ad note:', err);
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
      .limit(500);

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

// ==========================================
// 8. MOBILE AUTH FEATURE TOGGLE (Supabase integration)
// ==========================================

export const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  id: 'global',
  forceUserAuth: false,
  allowGuestScan: true,
  requireEmailVerification: false,
  sendWelcomeEmail: true,
  emailProvider: 'BOTH',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFromEmail: '',
  smtpFromName: 'Allo Halal',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin',
};

export const fetchAuthSettings = async (): Promise<AuthSettings> => {
  try {
    const { data, error } = await supabase
      .from('auth_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data) {
      const mapped: AuthSettings = {
        id: data.id,
        forceUserAuth: data.force_user_auth === true,
        allowGuestScan: data.allow_guest_scan !== false,
        requireEmailVerification: data.require_email_verification === true,
        sendWelcomeEmail: data.send_welcome_email !== false,
        emailProvider: (data.email_provider || 'BOTH').toUpperCase() as any,
        smtpHost: data.smtp_host || '',
        smtpPort: Number(data.smtp_port || 587),
        smtpUser: data.smtp_user || '',
        smtpPass: data.smtp_pass || '',
        smtpFromEmail: data.smtp_from_email || '',
        smtpFromName: data.smtp_from_name || 'Allo Halal',
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || 'Admin',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.AUTH_SETTINGS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase fetch Auth settings note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.AUTH_SETTINGS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
  }

  return DEFAULT_AUTH_SETTINGS;
};

export const saveAuthSettings = async (
  settings: AuthSettings,
  updatedBy: string = 'Admin'
): Promise<AuthSettings> => {
  const payload = {
    id: 'global',
    force_user_auth: settings.forceUserAuth,
    allow_guest_scan: !settings.forceUserAuth,
    require_email_verification: Boolean(settings.requireEmailVerification),
    send_welcome_email: settings.sendWelcomeEmail !== false,
    email_provider: settings.emailProvider || 'BOTH',
    smtp_host: (settings.smtpHost || '').trim(),
    smtp_port: Number(settings.smtpPort || 587),
    smtp_user: (settings.smtpUser || '').trim(),
    smtp_pass: settings.smtpPass || '',
    smtp_from_email: (settings.smtpFromEmail || '').trim(),
    smtp_from_name: (settings.smtpFromName || 'Allo Halal').trim(),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  try {
    const { error } = await supabase.from('auth_settings').upsert(payload);
    if (error) {
      console.error('Error saving Auth settings to Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.warn('Supabase save Auth settings warning:', err);
  }

  if (typeof window !== 'undefined') {
    const updated: AuthSettings = {
      ...settings,
      allowGuestScan: !settings.forceUserAuth,
      updatedAt: payload.updated_at,
      updatedBy,
    };
    localStorage.setItem(STORAGE_KEYS.AUTH_SETTINGS, JSON.stringify(updated));
  }

  return fetchAuthSettings();
};

// ==========================================
// 8. PUSH NOTIFICATIONS & FIREBASE FCM SETTINGS
// ==========================================

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  id: 'global',
  firebaseProjectId: 'allo-halal',
  firebaseApiKey: 'AIzaSyCPqOU5ymDEziX2CgcKUCU_p4cUyGQtKYw',
  firebaseAppId: '1:142036889274:android:e5b3b41e042d7d99c9dc83',
  firebaseMessagingSenderId: '142036889274',
  firebaseServiceAccountJson: JSON.stringify({
    type: 'service_account',
    project_id: 'allo-halal',
    private_key_id: 'c31ede5ba5237313f37699fdc6d3b5dc0aab777f',
    private_key:
      '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCp8hoQHe2CQCFE\nFuzd45fPHSAMgC+TaFQ4cvLckq/Dq9B9GXtYOrgg+qO3gum8S4Y48Q4tApq4GAwy\nrsH7NTLJSNvXowh3hQ+7+C0MRKolDZOY/ZglXzjyAF7hDYw7uM5dLdVRB0WgCh8+\nZYMbIIriV2SuU/u2DuZnazkyhYemlJGQoWQXonORqIutZg7oyMMlrK2pj8XRl7ne\nCqwP1WIvnHswN5zBhiOof4S9jhM09oghlDBNPLB9/hQkwBAbSIy7Y3xh5aNfbuDL\nX7XxjsV6d+yo6Z4z8+2uv6xrXGO+2Uura9l7S1XHSvKeHrJo5LcODveK3AaraMf3\nXsYvuwzdAgMBAAECggEASM9O10TbMwiit/dSeCZALh3+UxzARVlXa+/jmRjHcP+1\njUNTkxNlO8vmRIMz/NYmpVKxjhslimXTJAu3VBcQsSgj+BkDUaGSgifrtOveMY3F\nhLBxdOF9FkGOZMFXKWceEtHGKLcC33Q2upbnOsIQfrSOkBmvJ+ruT7SihsCqw3UE\nu6D3AZIowgpTatyykiw8aQcKe/2AEHzG0+e2dCTVM2CyiKcaRidR6IqB3N+wd7gS\nN4dQJMDC9hoWndOOjvh7en8WWmEWsZg+ICF6G5+NZlr0tFuNnwFNCFWNkErmkkU0\nbaRm1IhCAlGVqgCdWnawjTHNnVcCttPo1CWJMJ/oyQKBgQDVIL66dQHS+K0ax3Vu\n0Hya8PgBI8hRcNcUBQ/UPjbck1C1zrqUk7XEE+M2t6dLsc8Ha7B+2tGUYKddYSWD\n3j0OpthXelTPJXYNvUba1f1MkZZv0rOshAprG4IX+BrMxmGnVi8HHiA84IHoe0Rj\nvRvk5QfTLhztsCoTAFufa2D23wKBgQDMIaRidaGb6M4F1IZI1Tjb9ETAoFRM9EPt\nYH8wVRl3u1nZY/QUSzGxSt1hqu57AQZoMC1UKBD+1vXqm1I5gHfXHMfSfNLZDW8L\nQG3Yvs9xhoAMf2kAhnlYxAzSFez4ykxv4bGOr4aKWplWU0zmwjaH+09KTHmolTcD\nz+nPmkYfwwKBgHKo7TNu445WzvpLOHhnncHVxfcHAywdYviYSI3M8sL0VkWZdHOe\ni/lzIZg8cbqdbF33p7p3iq0i2qe4LfClzX9mb5mQbLQM2VhG7impWl6pLJ/4YUV8\nvAYnhHPUvMZSLBNUoHRZ1soplno2ZvKpuKoKNY19j36oedpDJQe9QytNAoGAPkhV\ne6Ugdg2GLsk1X6uO+a2B/LPuhLxSrW6v3/NXHe0P8QBKTJbUxp9tBIu+z9D0P33T\nlsXSya6Uwcw6PkkwR3YEkfh77LXol6pE2cj+SkkbcLS/OOXOyIKo1sDR2OcAg3J9\nVme/yR7zgh9Qa2f+c2b+PlEvHXzJmGQrlqgflTkCgYAbMNo4G5PKkDyNhPGZNoYN\nt8NuDbz8Vu+0Bod0P4oAZ2VtvV70dcTlfs1dLWN8NEgXcEUFU5U6VXutwxpR5EXr\nOnFjpH2QaKyng+0yO/Kkc4H9oivEo2TOv3S2Q0TBpmCeqMZ61uYJQqCrjtY0WSqS\na7aQjuSrUE+nTmZvvk5cBQ==\n-----END PRIVATE KEY-----\n',
    client_email: 'firebase-adminsdk-fbsvc@allo-halal.iam.gserviceaccount.com',
    client_id: '117812677018956201169',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url:
      'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40allo-halal.iam.gserviceaccount.com',
    universe_domain: 'googleapis.com',
  }, null, 2),
  firebaseServerKey: '',
  isEnabled: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin',
};

export const fetchNotificationData = async (): Promise<{
  settings: NotificationSettings;
  history: PushNotification[];
}> => {
  try {
    const res = await fetch('/api/v1/notifications', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(data.history || []));
          localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(data.settings));
        }
        return {
          settings: { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.settings || {}) },
          history: data.history || [],
        };
      }
    }
  } catch (err) {
    console.warn('API notification data fetch warning:', err);
  }

  // Fallback to local storage if API call fails
  let cachedSettings = DEFAULT_NOTIFICATION_SETTINGS;
  let cachedHistory: PushNotification[] = [];
  if (typeof window !== 'undefined') {
    const s = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (s) {
      try { cachedSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(s) }; } catch (_) {}
    }
    const h = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (h) {
      try { cachedHistory = JSON.parse(h); } catch (_) {}
    }
  }

  return { settings: cachedSettings, history: cachedHistory };
};

export const saveNotificationSettings = async (
  settings: NotificationSettings,
  updatedBy: string = 'Admin'
): Promise<NotificationSettings> => {
  try {
    const res = await fetch('/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_settings',
        firebaseProjectId: settings.firebaseProjectId,
        firebaseApiKey: settings.firebaseApiKey,
        firebaseAppId: settings.firebaseAppId,
        firebaseMessagingSenderId: settings.firebaseMessagingSenderId,
        firebaseServiceAccountJson: settings.firebaseServiceAccountJson,
        firebaseServerKey: settings.firebaseServerKey,
        isEnabled: settings.isEnabled,
        updatedBy,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save notification settings');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(data.settings));
    }
    return data.settings;
  } catch (err: any) {
    console.error('Error in saveNotificationSettings:', err);
    throw err;
  }
};

export const setNotificationsEnabled = async (
  isEnabled: boolean,
  updatedBy: string = 'Admin'
): Promise<void> => {
  const res = await fetch('/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle', isEnabled, updatedBy }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update push toggle');
  }
};

export const sendPushNotification = async (payload: {
  title: string;
  message: string;
  url?: string;
  country?: string;
  city?: string;
  sentBy?: string;
}): Promise<PushNotification> => {
  const res = await fetch('/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send',
      ...payload,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to send notification');
  }

  return data.notification;
};

