'use client';

import { Product, Additive, UserAccount, GeoAd, GroqApiLog, HalalStatus, AdMobSettings, GroqSettings, AuthSettings, PushNotification, NotificationSettings, CmsSettings, CmsTexts, Contribution, DonationStatus, DonationTier } from './types';
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
  CMS_SETTINGS: 'halallens_supabase_cms_settings',
  CONTRIBUTIONS: 'halallens_supabase_contributions',
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

export const deleteUserAccount = async (userId: string): Promise<UserAccount[]> => {
  try {
    await supabase.from('users').delete().eq('id', userId);
  } catch (err) {
    console.warn('Supabase delete user note:', err);
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

export const DEFAULT_EMAIL_TEMPLATES = {
  welcomeSubject: 'Welcome to Allo Halal! Your Account is Ready',
  welcomeTitle: 'Welcome to Allo Halal!',
  welcomeSubtitle: 'Your trusted AI-powered companion for verifying Halal products & ingredients',
  welcomeBody: `Assalamu Alaikum {name},

Thank you for joining the Allo Halal community! Your account is now active and ready to use across the mobile app.

Scan any food barcode to check Halal status, capture ingredient labels for instant AI analysis, and explore additives with authentic scholarly guidance.`,

  confirmationSubject: 'Confirm Your Allo Halal Account',
  confirmationTitle: 'Verify Your Email Address',
  confirmationSubtitle: 'Please verify your email address to secure and activate your account',
  confirmationBody: `Assalamu Alaikum {name},

Thank you for registering with Allo Halal! To ensure your account security and unlock full access to barcode scanning, AI ingredient analysis, and community features, please confirm your email address.

Click the confirmation button below or use your verification code to complete your registration.`,
};

export const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  id: 'global',
  forceUserAuth: false,
  allowGuestScan: true,
  enableContributions: true,
  requireEmailVerification: false,
  sendWelcomeEmail: true,
  emailProvider: 'SMTP',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFromEmail: '',
  smtpFromName: 'Allo Halal',
  welcomeEmailSubject: DEFAULT_EMAIL_TEMPLATES.welcomeSubject,
  welcomeEmailTitle: DEFAULT_EMAIL_TEMPLATES.welcomeTitle,
  welcomeEmailSubtitle: DEFAULT_EMAIL_TEMPLATES.welcomeSubtitle,
  welcomeEmailBody: DEFAULT_EMAIL_TEMPLATES.welcomeBody,
  confirmationEmailSubject: DEFAULT_EMAIL_TEMPLATES.confirmationSubject,
  confirmationEmailTitle: DEFAULT_EMAIL_TEMPLATES.confirmationTitle,
  confirmationEmailSubtitle: DEFAULT_EMAIL_TEMPLATES.confirmationSubtitle,
  confirmationEmailBody: DEFAULT_EMAIL_TEMPLATES.confirmationBody,
  contributionPresets: [1, 3, 5, 10, 15],
  defaultContributionAmount: 5,
  minContributionAmount: 1,
  maxContributionAmount: 50,
  contributionCurrency: 'EUR',
  coffeeMaxAmount: 2,
  serverMaxAmount: 4,
  growthMaxAmount: 9,
  enableHumanitarianCommitment: true,
  humanitarianTitle: 'Humanitarian Commitment & Solidarity',
  humanitarianBadge: 'Charity Redistribution Partner',
  humanitarianCharityShare: '20% Redistributed to Charity',
  humanitarianText: 'Allo Halal is driven by ethical and community values. In the spirit of Islamic solidarity, a dedicated portion of every free-will contribution is redirected towards verified humanitarian partners to provide emergency food aid and clean water for vulnerable families worldwide.',
  humanitarianOrganizationName: 'Global Halal Emergency Food Relief',
  humanitarianLearnMoreUrl: 'https://allohalal.fr/humanitarian',
  enableStripe: true,
  stripeMode: 'test',
  stripePublishableKey: 'pk_test_51P9nVoRrokKxR1k7GYpiCd7B9ZVwmR7MBuYx28GmKrRsaOPUHmSMSIESH62ZVDwx6IFlN8xSz7br9cg0LzfLVbrK00uFBuBNzr',
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  stripeCurrency: 'eur',
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
        enableContributions: data.enable_contributions !== false,
        requireEmailVerification: data.require_email_verification === true,
        sendWelcomeEmail: data.send_welcome_email !== false,
        emailProvider: 'SMTP',
        smtpHost: data.smtp_host || 'smtp.gmail.com',
        smtpPort: Number(data.smtp_port || 587),
        smtpUser: data.smtp_user || '',
        smtpPass: data.smtp_pass || '',
        smtpFromEmail: data.smtp_from_email || data.smtp_user || '',
        smtpFromName: data.smtp_from_name || 'Allo Halal',
        welcomeEmailSubject: data.welcome_email_subject || DEFAULT_EMAIL_TEMPLATES.welcomeSubject,
        welcomeEmailTitle: data.welcome_email_title || DEFAULT_EMAIL_TEMPLATES.welcomeTitle,
        welcomeEmailSubtitle: data.welcome_email_subtitle || DEFAULT_EMAIL_TEMPLATES.welcomeSubtitle,
        welcomeEmailBody: data.welcome_email_body || DEFAULT_EMAIL_TEMPLATES.welcomeBody,
        confirmationEmailSubject: data.confirmation_email_subject || DEFAULT_EMAIL_TEMPLATES.confirmationSubject,
        confirmationEmailTitle: data.confirmation_email_title || DEFAULT_EMAIL_TEMPLATES.confirmationTitle,
        confirmationEmailSubtitle: data.confirmation_email_subtitle || DEFAULT_EMAIL_TEMPLATES.confirmationSubtitle,
        confirmationEmailBody: data.confirmation_email_body || DEFAULT_EMAIL_TEMPLATES.confirmationBody,
        contributionPresets: Array.isArray(data.contribution_presets) ? data.contribution_presets : [1, 3, 5, 10, 15],
        defaultContributionAmount: Number(data.default_contribution_amount || 5),
        minContributionAmount: Number(data.min_contribution_amount || 1),
        maxContributionAmount: Number(data.max_contribution_amount || 50),
        contributionCurrency: data.contribution_currency || 'EUR',
        coffeeMaxAmount: Number(data.coffee_max_amount || 2),
        serverMaxAmount: Number(data.server_max_amount || 4),
        growthMaxAmount: Number(data.growth_max_amount || 9),
        enableHumanitarianCommitment: data.enable_humanitarian_commitment !== false,
        humanitarianTitle: data.humanitarian_title || 'Humanitarian Commitment & Solidarity',
        humanitarianBadge: data.humanitarian_badge || 'Charity Redistribution Partner',
        humanitarianCharityShare: data.humanitarian_charity_share || '20% Redistributed to Charity',
        humanitarianText: data.humanitarian_text || 'Allo Halal is driven by ethical and community values. In the spirit of Islamic solidarity, a dedicated portion of every free-will contribution is redirected towards verified humanitarian partners to provide emergency food aid and clean water for vulnerable families worldwide.',
        humanitarianOrganizationName: data.humanitarian_organization_name || 'Global Halal Emergency Food Relief',
        humanitarianLearnMoreUrl: data.humanitarian_learn_more_url || 'https://allohalal.fr/humanitarian',
        enableStripe: data.enable_stripe !== false,
        stripeMode: (data.stripe_mode === 'live' ? 'live' : 'test'),
        stripePublishableKey: data.stripe_publishable_key || '',
        stripeSecretKey: data.stripe_secret_key || '',
        stripeWebhookSecret: data.stripe_webhook_secret || '',
        stripeCurrency: data.stripe_currency || 'eur',
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
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_AUTH_SETTINGS,
          ...parsed,
        };
      } catch (_) {}
    }
  }

  return DEFAULT_AUTH_SETTINGS;
};

export const saveAuthSettings = async (
  settings: AuthSettings,
  updatedBy: string = 'Admin'
): Promise<AuthSettings> => {
  const payload: Record<string, any> = {
    id: 'global',
    force_user_auth: settings.forceUserAuth,
    allow_guest_scan: !settings.forceUserAuth,
    enable_contributions: settings.enableContributions !== false,
    require_email_verification: Boolean(settings.requireEmailVerification),
    send_welcome_email: settings.sendWelcomeEmail !== false,
    email_provider: settings.emailProvider || 'BOTH',
    smtp_host: (settings.smtpHost || '').trim(),
    smtp_port: Number(settings.smtpPort || 587),
    smtp_user: (settings.smtpUser || '').trim(),
    smtp_pass: settings.smtpPass || '',
    smtp_from_email: (settings.smtpFromEmail || '').trim(),
    smtp_from_name: (settings.smtpFromName || 'Allo Halal').trim(),
    welcome_email_subject: settings.welcomeEmailSubject ?? DEFAULT_EMAIL_TEMPLATES.welcomeSubject,
    welcome_email_title: settings.welcomeEmailTitle ?? DEFAULT_EMAIL_TEMPLATES.welcomeTitle,
    welcome_email_subtitle: settings.welcomeEmailSubtitle ?? DEFAULT_EMAIL_TEMPLATES.welcomeSubtitle,
    welcome_email_body: settings.welcomeEmailBody ?? DEFAULT_EMAIL_TEMPLATES.welcomeBody,
    confirmation_email_subject: settings.confirmationEmailSubject ?? DEFAULT_EMAIL_TEMPLATES.confirmationSubject,
    confirmation_email_title: settings.confirmationEmailTitle ?? DEFAULT_EMAIL_TEMPLATES.confirmationTitle,
    confirmation_email_subtitle: settings.confirmationEmailSubtitle ?? DEFAULT_EMAIL_TEMPLATES.confirmationSubtitle,
    confirmation_email_body: settings.confirmationEmailBody ?? DEFAULT_EMAIL_TEMPLATES.confirmationBody,
    contribution_presets: settings.contributionPresets || [1, 3, 5, 10, 15],
    default_contribution_amount: Number(settings.defaultContributionAmount || 5),
    min_contribution_amount: Number(settings.minContributionAmount || 1),
    max_contribution_amount: Number(settings.maxContributionAmount || 50),
    contribution_currency: settings.contributionCurrency || 'EUR',
    coffee_max_amount: Number(settings.coffeeMaxAmount || 2),
    server_max_amount: Number(settings.serverMaxAmount || 4),
    growth_max_amount: Number(settings.growthMaxAmount || 9),
    enable_humanitarian_commitment: settings.enableHumanitarianCommitment !== false,
    humanitarian_title: settings.humanitarianTitle || 'Humanitarian Commitment & Solidarity',
    humanitarian_badge: settings.humanitarianBadge || 'Charity Redistribution Partner',
    humanitarian_charity_share: settings.humanitarianCharityShare || '20% Redistributed to Charity',
    humanitarian_text: settings.humanitarianText || '',
    humanitarian_organization_name: settings.humanitarianOrganizationName || 'Global Halal Emergency Food Relief',
    humanitarian_learn_more_url: settings.humanitarianLearnMoreUrl || 'https://allohalal.fr/humanitarian',
    enable_stripe: settings.enableStripe !== false,
    stripe_mode: settings.stripeMode === 'live' ? 'live' : 'test',
    stripe_publishable_key: (settings.stripePublishableKey || '').trim(),
    stripe_secret_key: (settings.stripeSecretKey || '').trim(),
    stripe_webhook_secret: (settings.stripeWebhookSecret || '').trim(),
    stripe_currency: (settings.stripeCurrency || 'eur').trim().toLowerCase(),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  try {
    const { error } = await supabase.from('auth_settings').upsert(payload);
    if (error) {
      console.warn('Initial Supabase upsert error, attempting fallback without template columns:', error.message);
      // Fallback in case table does not have new template columns yet
      const fallbackPayload = {
        id: 'global',
        force_user_auth: settings.forceUserAuth,
        allow_guest_scan: !settings.forceUserAuth,
        enable_contributions: settings.enableContributions !== false,
        require_email_verification: Boolean(settings.requireEmailVerification),
        send_welcome_email: settings.sendWelcomeEmail !== false,
        email_provider: settings.emailProvider || 'BOTH',
        smtp_host: (settings.smtpHost || '').trim(),
        smtp_port: Number(settings.smtpPort || 587),
        smtp_user: (settings.smtpUser || '').trim(),
        smtp_pass: settings.smtpPass || '',
        smtp_from_email: (settings.smtpFromEmail || '').trim(),
        smtp_from_name: (settings.smtpFromName || 'Allo Halal').trim(),
        updated_at: payload.updated_at,
        updated_by: updatedBy,
      };
      await supabase.from('auth_settings').upsert(fallbackPayload);
    }
  } catch (err) {
    console.warn('Supabase save Auth settings warning:', err);
  }

  if (typeof window !== 'undefined') {
    const updated: AuthSettings = {
      ...DEFAULT_AUTH_SETTINGS,
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

// ==========================================
// 9. DYNAMIC UI TEXT / CMS SETTINGS (Supabase integration)
// ==========================================

export const DEFAULT_CMS_TEXTS: CmsTexts = {
  appName: 'Allo Halal',
  splashSubtitle: 'Vérification Halal IA Instantanée',
  heroSubtitle: "Scannez n'importe quel code-barres ou\nétiquette pour vérifier le statut Halal.",
  scanBarcodeBtn: 'Scanner un Code',
  analyzeTextBtn: 'Scanner Ingrédients',
  manualEntryBtn: 'Ou entrer manuellement',

  feature1Title: 'Scanner Code-barres',
  feature1Desc: 'Pointez votre caméra pour vérifier instantanément',
  feature2Title: 'Scanner Ingrédients',
  feature2Desc: 'Prenez une photo pour une analyse approfondie',
  feature3Title: 'Résultats IA instantanés',
  feature3Desc: 'Obtenez un statut Halal clair avec des explications',

  onboarding1Title: 'Scan instantané',
  onboarding1Desc: "Pointez votre caméra vers n'importe quel code-barres alimentaire pour obtenir sa liste d'ingrédients et son statut halal.",
  onboarding2Title: 'Scanner les ingrédients',
  onboarding2Desc: "Pas de code-barres ? Prenez l'étiquette en photo et laissez l'IA l'analyser instantanément dans votre langue.",
  onboarding3Title: 'Analyse experte IA',
  onboarding3Desc: 'Propulsé par Groq AI, notre système détecte les dérivés animaux cachés et les additifs E douteux en quelques secondes.',
  onboarding4Title: 'Base de données mondiale',
  onboarding4Desc: 'Soutenu par Open Food Facts, vous donnant accès à la vérification halal pour des millions de produits dans le monde.',

  loginTitle: 'Bon retour',
  loginSubtitle: 'Connectez-vous à votre compte pour synchroniser votre historique et vos préférences.',
  registerTitle: 'Créer votre compte',
  registerSubtitle: 'Inscrivez-vous pour sauvegarder vos scans, synchroniser votre historique et vérifier les produits Halal partout.',
  textScanTitle: "Analyse d'Image",
  textScanSubtitle: "Analysez les ingrédients directement à partir des étiquettes grâce à l'IA Vision.",
  resultDisclaimer: "Cette analyse est générée par l'IA à titre indicatif. Vérifiez toujours auprès des organismes de certification halal agréés.",

  aboutTitle: "À propos d'Allo Halal",
  aboutContent:
    "Allo Halal est un assistant de vérification Halal de nouvelle génération propulsé par l'intelligence artificielle, spécialement conçu pour les consommateurs musulmans exigeants.\n\nÀ l'ère de chaînes agroalimentaires mondialisées et de listes d'ingrédients de plus en plus complexes (additifs E, dérivés animaux cachés, gélatines, arômes), vérifier la conformité halal d'un aliment peut s'avérer fastidieux. Allo Halal combine une IA de pointe et une immense base de données mondiale pour vous apporter une réponse claire, instantanée et sourcée.\n\nFonctionnalités clés :\n• Analyse IA Avancée : Utilisation des derniers modèles Llama 3 Vision de Groq AI pour décrypter les étiquettes alimentaires en temps réel.\n• Base de Données Mondiale : Accès à plus de 3 millions de produits certifiés et analysés grâce à Open Food Facts et nos partenaires.\n• Dictionnaire des Additifs (E-Numbers) : Explications détaillées sur plus de 500 additifs avec avis des écoles juridiques islamiques (Halal, Haram, Mushbooh).\n• Scanner Vision OCR : Prenez en photo n'importe quelle liste d'ingrédients en magasin ; l'IA la traduit et identifie les composants suspects en quelques millisecondes.\n• 100 % Respectueux de votre Vie Privée : Architecture Privacy-First, stricte conformité RGPD européenne.\n\nNotre mission : Vous offrir transparence, sérénité et autonomie dans vos choix alimentaires quotidiens.",
  helpTitle: 'Aide et support',
  helpContent:
    "Besoin d'aide ou des suggestions ? L'équipe Allo Halal s'engage à vous offrir la meilleure expérience.\n\nSujets d'assistance courants :\n• Signaler des résultats incorrects : L'IA peut parfois se tromper. Si vous remarquez un statut erroné pour un produit, transmettez-nous le code-barres et la photo de l'étiquette par e-mail.\n• Produit introuvable : Si le produit n'est pas encore répertorié dans la base, utilisez la fonction 'Scanner Ingrédients' pour analyser directement la liste des ingrédients grâce à l'IA Vision.\n• Problèmes de connexion ou lenteurs : Vérifiez votre accès internet. Les analyses d'ingrédients avancées sont traitées instantanément via nos serveurs cloud sécurisés.\n• Gestion du compte et des données : Pour modifier vos informations de profil ou demander la suppression de votre compte (conformité RGPD), envoyez un message à notre support.\n\nNous contacter :\n• E-mail d'assistance : support@allohalal.fr\n• Site officiel : www.allohalal.fr\n• Centre d'aide & FAQ : allohalal.fr/faq\n\nNotre équipe d'assistance répond généralement dans un délai de 24 à 48 heures ouvrées. Vos retours nous aident à améliorer Allo Halal pour toute la communauté !",
  privacyTitle: 'Politique de confidentialité (RGPD)',
  privacyContent:
    "Dernière mise à jour : Octobre 2026\nConforme au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679)\n\n1. Responsable du Traitement\nL'application Allo Halal est éditée par Allo Halal. Nous accordons une importance primordiale à la confidentialité et à la sécurité de vos données personnelles.\nPour toute question relative à la protection de vos données ou pour contacter notre Délégué à la Protection des Données (DPO) :\n• E-mail : support@allohalal.fr\n• Site officiel : www.allohalal.fr\n\n2. Données Personnelles Collectées\nNous collectons uniquement les informations strictement nécessaires aux fonctionnalités de l'application :\n• Données de compte : Nom complet, nom d'utilisateur, adresse e-mail, pays et ville renseignés lors de l'inscription.\n• Données d'utilisation : Historique des produits scannés et liste de favoris (conservés localement et synchronisés de manière chiffrée si vous êtes connecté).\n• Données techniques : Modèle d'appareil, version du système d'exploitation et identifiant anonymisé de diagnostic.\n• Accès Caméra : Sollicité uniquement pour le scan de codes-barres ou la prise de photo des étiquettes d'ingrédients. Les images envoyées à notre IA Vision pour analyse ne sont jamais conservées de manière permanente sur nos serveurs.\n\n3. Finalités et Bases Légales du Traitement (Art. 6 RGPD)\n• Fourniture du service d'analyse d'ingrédients et gestion de votre compte (Art. 6.1.b - Exécution contractuelle).\n• Notifications d'alertes alimentaires ou mises à jour importantes (Art. 6.1.a - Consentement).\n• Sécurisation des accès et prévention des abus (Art. 6.1.f - Intérêt légitime).\n\n4. Confidentialité et Destinataires des Données\n• Vos données personnelles ne sont JAMAIS vendues, louées ou partagées avec des régies publicitaires tierces.\n• Toutes les communications sont chiffrées selon le protocole TLS 1.3 / SSL via des serveurs sécurisés situés dans l'Union Européenne.\n\n5. Durée de Conservation\n• Les données de votre profil sont conservées tant que votre compte reste actif. Vous pouvez à tout moment demander leur effacement total.\n• L'historique local peut être purgé immédiatement depuis les paramètres de votre application.\n\n6. Vos Droits sous le RGPD (Articles 15 à 22)\nConformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :\n• Droit d'accès et d'information (Art. 15)\n• Droit de rectification (Art. 16)\n• Droit à l'effacement / « Droit à l'oubli » (Art. 17)\n• Droit à la limitation du traitement (Art. 18)\n• Droit à la portabilité de vos données (Art. 20)\n• Droit d'opposition (Art. 21)\n\nPour exercer vos droits, écrivez simplement à : support@allohalal.fr. Nous vous répondrons dans un délai maximal de 30 jours.\n\n7. Réclamation auprès de l'Autorité de Contrôle (CNIL)\nSi vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés - France : www.cnil.fr).",
  termsTitle: "Conditions Générales d'Utilisation",
  termsContent:
    "Conditions Générales d'Utilisation (CGU)\nDernière mise à jour : Octobre 2026\n\n1. Objet et Acceptation\nLes présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de l'application mobile Allo Halal. L'utilisation de l'application implique l'acceptation sans réserve des présentes conditions.\n\n2. Nature Indicative des Analyses IA\nL'application fournit des analyses de statut Halal basées sur la reconnaissance automatique d'images (OCR) et des modèles d'intelligence artificielle. Ces analyses sont fournies à titre purement indicatif et consultatif. Bien que nous nous efforcions d'assurer une exactitude maximale, l'utilisateur est invité à vérifier directement les étiquettes et à se référer aux organismes officiels de certification halal en cas de doute.\n\n3. Propriété Intellectuelle\nTous les contenus, logos, graphismes et logiciels composant Allo Halal sont la propriété exclusive d'Allo Halal et sont protégés par les lois internationales sur la propriété intellectuelle.\n\n4. Comportement des Utilisateurs\nL'utilisateur s'engage à utiliser l'application dans le respect des lois en vigueur et à ne pas tenter de perturber le fonctionnement des serveurs ou d'extraire des données de manière automatisée.\n\n5. Mises à Jour en Temps Réel\nAllo Halal se réserve le droit de modifier les présentes CGU à tout moment. Toute modification est immédiatement synchronisée dans l'application via notre système CMS.\n\nContact légal : support@allohalal.fr",
  geoAdsNoticeText: 'Offres et promotions Halal à proximité de vous',

  // Registration Email Customization (Welcome & Confirmation)
  welcomeEmailSubject: DEFAULT_EMAIL_TEMPLATES.welcomeSubject,
  welcomeEmailTitle: DEFAULT_EMAIL_TEMPLATES.welcomeTitle,
  welcomeEmailSubtitle: DEFAULT_EMAIL_TEMPLATES.welcomeSubtitle,
  welcomeEmailBody: DEFAULT_EMAIL_TEMPLATES.welcomeBody,
  confirmationEmailSubject: DEFAULT_EMAIL_TEMPLATES.confirmationSubject,
  confirmationEmailTitle: DEFAULT_EMAIL_TEMPLATES.confirmationTitle,
  confirmationEmailSubtitle: DEFAULT_EMAIL_TEMPLATES.confirmationSubtitle,
  confirmationEmailBody: DEFAULT_EMAIL_TEMPLATES.confirmationBody,
};

export const DEFAULT_CMS_SETTINGS: CmsSettings = {
  id: 'global',
  texts: DEFAULT_CMS_TEXTS,
  translations: {},
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin',
};

export const fetchCmsSettings = async (): Promise<CmsSettings> => {
  try {
    const { data, error } = await supabase
      .from('cms_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data) {
      const mapped: CmsSettings = {
        id: data.id || 'global',
        texts: {
          ...DEFAULT_CMS_TEXTS,
          ...(data.texts || {}),
        },
        translations: data.translations || {},
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || 'Admin',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CMS_SETTINGS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase fetch CMS settings note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.CMS_SETTINGS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_CMS_SETTINGS,
          ...parsed,
          texts: {
            ...DEFAULT_CMS_TEXTS,
            ...(parsed.texts || {}),
          },
        };
      } catch (_) {}
    }
  }

  return DEFAULT_CMS_SETTINGS;
};

export const saveCmsSettings = async (
  settings: CmsSettings,
  updatedBy: string = 'Admin'
): Promise<CmsSettings> => {
  const payload = {
    id: 'global',
    texts: settings.texts,
    translations: settings.translations || {},
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  try {
    const { error } = await supabase.from('cms_settings').upsert(payload);
    if (error) {
      console.error('Error saving CMS settings to Supabase:', error);
      throw error;
    }
  } catch (err) {
    console.warn('Supabase save CMS settings warning:', err);
  }

  if (typeof window !== 'undefined') {
    const updated: CmsSettings = {
      ...settings,
      updatedAt: payload.updated_at,
      updatedBy,
    };
    localStorage.setItem(STORAGE_KEYS.CMS_SETTINGS, JSON.stringify(updated));
  }

  return fetchCmsSettings();
};

// ==========================================
// 10. COMMUNITY DONATIONS & FREE-WILL CONTRIBUTIONS ("Prix libre")
// Real live contributions ledger (No static/demo data)
// ==========================================

export const DEFAULT_CONTRIBUTIONS: Contribution[] = [];

export const fetchContributions = async (): Promise<Contribution[]> => {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const mapped: Contribution[] = data.map((item: any) => {
        const rawTier = String(item.tier || 'SERVER').toUpperCase();
        const tier: DonationTier = ['COFFEE', 'SERVER', 'GROWTH', 'PATRON'].includes(rawTier)
          ? (rawTier as DonationTier)
          : 'SERVER';

        const rawStatus = String(item.status || 'COMPLETED').toUpperCase();
        const status =
          rawStatus === 'PENDING'
            ? 'PENDING'
            : rawStatus === 'REFUNDED'
            ? 'REFUNDED'
            : 'COMPLETED';

        return {
          id: String(item.id || item.transaction_id || `don_${Date.now()}`),
          donorName: item.donor_name || item.user_name || 'Allo Halal Mobile Supporter',
          donorEmail: item.donor_email || item.user_email || '',
          donorLocation: item.donor_location || item.user_location,
          amount: Number(item.amount || 0),
          currency: (item.currency || 'EUR').toUpperCase(),
          tier,
          paymentMethod: (item.payment_method || 'STRIPE').toUpperCase(),
          transactionId: item.transaction_id || item.stripe_session_id || item.id,
          message: item.message || item.moderator_note || '',
          status,
          isAnonymous: item.is_anonymous === true,
          reviewedBy: item.reviewed_by,
          createdAt: item.created_at || new Date().toISOString(),
        };
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(mapped));
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase fetch Contributions note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
    if (cached) {
      try {
        const rawList = JSON.parse(cached);
        if (Array.isArray(rawList)) {
          // Filter out legacy static demo items
          const sanitized: Contribution[] = rawList
            .filter((item: any) => {
              const id = String(item.id || '');
              return id !== 'don_1' && id !== 'don_2' && id !== 'don_3' && id !== 'don_4' && id !== 'don_5' && id !== 'don_6';
            })
            .map((item: any, idx: number) => ({
              id: item.id || `contrib_${Date.now()}_${idx}`,
              donorName: item.donorName || item.donor_name || item.userName || item.user_name || 'Anonymous Donor',
              donorEmail: item.donorEmail || item.donor_email || item.userEmail || item.user_email || '',
              donorLocation: item.donorLocation || item.donor_location || item.userLocation || item.user_location,
              amount: Number(item.amount || 0),
              currency: item.currency || 'EUR',
              tier: item.tier || 'SERVER',
              paymentMethod: item.paymentMethod || item.payment_method || 'STRIPE',
              transactionId: item.transactionId || item.transaction_id,
              message: item.message || item.moderatorNote || item.moderator_note || '',
              status: item.status === 'PENDING' ? 'PENDING' : item.status === 'REFUNDED' ? 'REFUNDED' : 'COMPLETED',
              isAnonymous: Boolean(item.isAnonymous ?? item.is_anonymous),
              reviewedBy: item.reviewedBy || item.reviewed_by,
              createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            }));

          localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(sanitized));
          return sanitized;
        }
      } catch (_) {}
    }
  }

  return [];
};

export const saveContribution = async (contrib: Contribution): Promise<Contribution> => {
  const payload = {
    id: contrib.id,
    donor_name: contrib.donorName,
    donor_email: contrib.donorEmail,
    donor_location: contrib.donorLocation,
    amount: contrib.amount,
    currency: contrib.currency,
    tier: contrib.tier,
    payment_method: contrib.paymentMethod,
    transaction_id: contrib.transactionId,
    message: contrib.message,
    status: contrib.status,
    is_anonymous: Boolean(contrib.isAnonymous),
    reviewed_by: contrib.reviewedBy,
    created_at: contrib.createdAt,
  };

  try {
    const { error } = await supabase.from('contributions').upsert(payload);
    if (error) console.warn('Supabase save contribution note:', error.message);
  } catch (err) {
    console.warn('Supabase save contribution error:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
    let list: Contribution[] = cached ? JSON.parse(cached) : [...DEFAULT_CONTRIBUTIONS];
    const index = list.findIndex((c) => c.id === contrib.id);
    if (index >= 0) {
      list[index] = contrib;
    } else {
      list = [contrib, ...list];
    }
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(list));
  }

  return contrib;
};

export const updateContributionStatus = async (
  id: string,
  status: DonationStatus,
  reviewedBy: string = 'Admin'
): Promise<Contribution[]> => {
  try {
    await supabase
      .from('contributions')
      .update({
        status,
        reviewed_by: reviewedBy,
      })
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase update donation status note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
    let list: Contribution[] = cached ? JSON.parse(cached) : [...DEFAULT_CONTRIBUTIONS];
    list = list.map((c) =>
      c.id === id
        ? {
            ...c,
            status,
            reviewedBy,
          }
        : c
    );
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(list));
    return list;
  }

  return fetchContributions();
};

export const deleteContribution = async (id: string): Promise<Contribution[]> => {
  try {
    await supabase.from('contributions').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase delete contribution note:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
    let list: Contribution[] = cached ? JSON.parse(cached) : [...DEFAULT_CONTRIBUTIONS];
    list = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(list));
    return list;
  }

  return fetchContributions();
};


