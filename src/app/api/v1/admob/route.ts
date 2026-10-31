import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get('platform') || '').toLowerCase(); // 'android' | 'ios'

    const { data, error } = await supabase
      .from('admob_settings')
      .select('*')
      .eq('id', 'global')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('AdMob GET API warning:', error);
    }

    const s = data || {
      ads_enabled: false,
      test_mode: true,
      banner_enabled: true,
      interstitial_enabled: true,
      app_open_enabled: true,
      native_enabled: true,
      rewarded_enabled: false,
      interstitial_interval_scans: 3,
      app_open_cooldown_minutes: 15,
      banner_refresh_rate_seconds: 60,
      android_app_id: '',
      android_banner_id: '',
      android_interstitial_id: '',
      android_app_open_id: '',
      android_native_id: '',
      android_rewarded_id: '',
      ios_app_id: '',
      ios_banner_id: '',
      ios_interstitial_id: '',
      ios_app_open_id: '',
      ios_native_id: '',
      ios_rewarded_id: '',
      test_android_app_id: 'ca-app-pub-3940256099942544~3347511713',
      test_android_banner_id: 'ca-app-pub-3940256099942544/6300978111',
      test_android_interstitial_id: 'ca-app-pub-3940256099942544/1033173712',
      test_android_app_open_id: 'ca-app-pub-3940256099942544/9257395921',
      test_android_native_id: 'ca-app-pub-3940256099942544/2247696110',
      test_android_rewarded_id: 'ca-app-pub-3940256099942544/5224354917',
      test_ios_app_id: 'ca-app-pub-3940256099942544~1458002511',
      test_ios_banner_id: 'ca-app-pub-3940256099942544/2934735716',
      test_ios_interstitial_id: 'ca-app-pub-3940256099942544/4411468910',
      test_ios_app_open_id: 'ca-app-pub-3940256099942544/5575463023',
      test_ios_native_id: 'ca-app-pub-3940256099942544/3986624511',
      test_ios_rewarded_id: 'ca-app-pub-3940256099942544/1712485313',
    };

    // Resolve unit IDs based on requesting platform (iOS or Android)
    const isIos = platform === 'ios';

    const appId = (
      isIos
        ? (s.ios_app_id || s.test_ios_app_id || 'ca-app-pub-3940256099942544~1458002511')
        : (s.android_app_id || s.test_android_app_id || 'ca-app-pub-3940256099942544~3347511713')
    ).trim();

    const bannerId = (
      isIos
        ? (s.ios_banner_id || s.banner_id_ios || s.test_ios_banner_id || 'ca-app-pub-3940256099942544/2934735716')
        : (s.android_banner_id || s.banner_id_android || s.test_android_banner_id || 'ca-app-pub-3940256099942544/6300978111')
    ).trim();

    const interstitialId = (
      isIos
        ? (s.ios_interstitial_id || s.interstitial_id_ios || s.test_ios_interstitial_id || 'ca-app-pub-3940256099942544/4411468910')
        : (s.android_interstitial_id || s.interstitial_id_android || s.test_android_interstitial_id || 'ca-app-pub-3940256099942544/1033173712')
    ).trim();

    const appOpenId = (
      isIos
        ? (s.ios_app_open_id || s.test_ios_app_open_id || 'ca-app-pub-3940256099942544/5575463023')
        : (s.android_app_open_id || s.test_android_app_open_id || 'ca-app-pub-3940256099942544/9257395921')
    ).trim();

    const nativeId = (
      isIos
        ? (s.ios_native_id || s.test_ios_native_id || 'ca-app-pub-3940256099942544/3986624511')
        : (s.android_native_id || s.test_android_native_id || 'ca-app-pub-3940256099942544/2247696110')
    ).trim();

    const rewardedId = (
      isIos
        ? (s.ios_rewarded_id || s.rewarded_id_ios || s.test_ios_rewarded_id || 'ca-app-pub-3940256099942544/1712485313')
        : (s.android_rewarded_id || s.rewarded_id_android || s.test_android_rewarded_id || 'ca-app-pub-3940256099942544/5224354917')
    ).trim();

    const activeIds = {
      platform: isIos ? 'ios' : 'android',
      appId,
      bannerId,
      interstitialId,
      appOpenId,
      nativeId,
      rewardedId,
    };

    return NextResponse.json({
      success: true,
      adsEnabled: s.ads_enabled === true,
      // Direct unit IDs for mobile app
      appId,
      bannerId,
      interstitialId,
      appOpenId,
      nativeId,
      rewardedId,
      formats: {
        banner: s.banner_enabled !== false,
        interstitial: s.interstitial_enabled !== false,
        appOpen: s.app_open_enabled !== false,
        native: s.native_enabled !== false,
        rewarded: s.rewarded_enabled === true,
      },
      frequency: {
        interstitialIntervalScans: s.interstitial_interval_scans || 3,
        appOpenCooldownMinutes: s.app_open_cooldown_minutes || 15,
        bannerRefreshRateSeconds: s.banner_refresh_rate_seconds || 60,
      },
      activeIds,
      raw: {
        id: s.id || 'global',
        adsEnabled: s.ads_enabled,
        bannerEnabled: s.banner_enabled,
        interstitialEnabled: s.interstitial_enabled,
        appOpenEnabled: s.app_open_enabled,
        nativeEnabled: s.native_enabled,
        rewardedEnabled: s.rewarded_enabled,
        interstitialIntervalScans: s.interstitial_interval_scans,
        appOpenCooldownMinutes: s.app_open_cooldown_minutes,
        bannerRefreshRateSeconds: s.banner_refresh_rate_seconds,
        androidAppId: appId,
        androidBannerId: bannerId,
        androidInterstitialId: interstitialId,
        androidAppOpenId: appOpenId,
        androidNativeId: nativeId,
        androidRewardedId: rewardedId,
        updatedAt: s.updated_at,
        updatedBy: s.updated_by,
      },
    });
  } catch (error: any) {
    console.error('Error fetching AdMob settings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = {
      id: 'global',
      ads_enabled: Boolean(body.adsEnabled),
      test_mode: Boolean(body.testMode),
      banner_enabled: Boolean(body.bannerEnabled),
      interstitial_enabled: Boolean(body.interstitialEnabled),
      app_open_enabled: Boolean(body.appOpenEnabled),
      native_enabled: Boolean(body.nativeEnabled),
      rewarded_enabled: Boolean(body.rewardedEnabled),
      interstitial_interval_scans: Number(body.interstitialIntervalScans) || 3,
      app_open_cooldown_minutes: Number(body.appOpenCooldownMinutes) || 15,
      banner_refresh_rate_seconds: Number(body.bannerRefreshRateSeconds) || 60,
      android_app_id: (body.androidAppId || body.appId || '').trim(),
      android_banner_id: (body.androidBannerId || body.bannerId || '').trim(),
      android_interstitial_id: (body.androidInterstitialId || body.interstitialId || '').trim(),
      android_app_open_id: (body.androidAppOpenId || body.appOpenId || '').trim(),
      android_native_id: (body.androidNativeId || body.nativeId || '').trim(),
      android_rewarded_id: (body.androidRewardedId || body.rewardedId || '').trim(),
      ios_app_id: (body.iosAppId || '').trim(),
      ios_banner_id: (body.iosBannerId || '').trim(),
      ios_interstitial_id: (body.iosInterstitialId || '').trim(),
      ios_app_open_id: (body.iosAppOpenId || '').trim(),
      ios_native_id: (body.iosNativeId || '').trim(),
      ios_rewarded_id: (body.iosRewardedId || '').trim(),
      test_android_app_id: (body.testAndroidAppId || '').trim() || 'ca-app-pub-3940256099942544~3347511713',
      test_android_banner_id: (body.testAndroidBannerId || '').trim() || 'ca-app-pub-3940256099942544/6300978111',
      test_android_interstitial_id: (body.testAndroidInterstitialId || '').trim() || 'ca-app-pub-3940256099942544/1033173712',
      test_android_app_open_id: (body.testAndroidAppOpenId || '').trim() || 'ca-app-pub-3940256099942544/9257395921',
      test_android_native_id: (body.testAndroidNativeId || '').trim() || 'ca-app-pub-3940256099942544/2247696110',
      test_android_rewarded_id: (body.testAndroidRewardedId || '').trim() || 'ca-app-pub-3940256099942544/5224354917',
      test_ios_app_id: (body.testIosAppId || '').trim() || 'ca-app-pub-3940256099942544~1458002511',
      test_ios_banner_id: (body.testIosBannerId || '').trim() || 'ca-app-pub-3940256099942544/2934735716',
      test_ios_interstitial_id: (body.testIosInterstitialId || '').trim() || 'ca-app-pub-3940256099942544/4411468910',
      test_ios_app_open_id: (body.testIosAppOpenId || '').trim() || 'ca-app-pub-3940256099942544/5575463023',
      test_ios_native_id: (body.testIosNativeId || '').trim() || 'ca-app-pub-3940256099942544/3986624511',
      test_ios_rewarded_id: (body.testIosRewardedId || '').trim() || 'ca-app-pub-3940256099942544/1712485313',
      updated_at: new Date().toISOString(),
      updated_by: body.updatedBy || 'Admin',
    };

    const { data, error } = await supabase
      .from('admob_settings')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving AdMob settings to Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'AdMob configuration saved successfully',
      settings: data,
    });
  } catch (error: any) {
    console.error('Error in POST /api/v1/admob:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
