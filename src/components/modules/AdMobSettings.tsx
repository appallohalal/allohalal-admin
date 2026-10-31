'use client';

import React, { useState } from 'react';
import {
  Save,
  Check,
  Radio,
  Layers,
  Layout,
  Maximize2,
  Sparkles,
  Award,
  Smartphone,
} from 'lucide-react';
import { AdMobSettings } from '@/lib/types';
import { DEFAULT_ADMOB_SETTINGS } from '@/lib/storage';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';

interface AdMobSettingsProps {
  settings: AdMobSettings;
  onSave: (settings: AdMobSettings) => Promise<void>;
  currentUser?: { name?: string };
}

export const AdMobSettingsView: React.FC<AdMobSettingsProps> = ({
  settings: initialSettings,
  onSave,
  currentUser,
}) => {
  const [form, setForm] = useState<AdMobSettings>(initialSettings || DEFAULT_ADMOB_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');

  React.useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        ...form,
        updatedBy: currentUser?.name || 'Admin',
      });
      setSaveSuccess(true);
      toast.success('AdMob configuration saved successfully for Android and iOS.', 'Settings Saved');
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Failed to save AdMob settings:', err);
      toast.error(err.message || 'Failed to save settings.', 'Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  const loadAndroidTestDefaults = () => {
    setForm((p) => ({
      ...p,
      androidAppId: DEFAULT_ADMOB_SETTINGS.testAndroidAppId || 'ca-app-pub-3940256099942544~3347511713',
      androidBannerId: DEFAULT_ADMOB_SETTINGS.testAndroidBannerId || 'ca-app-pub-3940256099942544/6300978111',
      androidInterstitialId: DEFAULT_ADMOB_SETTINGS.testAndroidInterstitialId || 'ca-app-pub-3940256099942544/1033173712',
      androidAppOpenId: DEFAULT_ADMOB_SETTINGS.testAndroidAppOpenId || 'ca-app-pub-3940256099942544/9257395921',
      androidNativeId: DEFAULT_ADMOB_SETTINGS.testAndroidNativeId || 'ca-app-pub-3940256099942544/2247696110',
      androidRewardedId: DEFAULT_ADMOB_SETTINGS.testAndroidRewardedId || 'ca-app-pub-3940256099942544/5224354917',
    }));
    toast.success('Loaded Google Android Test IDs. Click "Save Configuration" to persist.', 'Defaults Loaded');
  };

  const loadIosTestDefaults = () => {
    setForm((p) => ({
      ...p,
      iosAppId: DEFAULT_ADMOB_SETTINGS.testIosAppId || 'ca-app-pub-3940256099942544~1458002511',
      iosBannerId: DEFAULT_ADMOB_SETTINGS.testIosBannerId || 'ca-app-pub-3940256099942544/2934735716',
      iosInterstitialId: DEFAULT_ADMOB_SETTINGS.testIosInterstitialId || 'ca-app-pub-3940256099942544/4411468910',
      iosAppOpenId: DEFAULT_ADMOB_SETTINGS.testIosAppOpenId || 'ca-app-pub-3940256099942544/5575463023',
      iosNativeId: DEFAULT_ADMOB_SETTINGS.testIosNativeId || 'ca-app-pub-3940256099942544/3986624511',
      iosRewardedId: DEFAULT_ADMOB_SETTINGS.testIosRewardedId || 'ca-app-pub-3940256099942544/1712485313',
    }));
    toast.success('Loaded Google iOS Test IDs. Click "Save Configuration" to persist.', 'Defaults Loaded');
  };

  const c = APP_COLORS.classes;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* 1. Master Ads Switch */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              form.adsEnabled
                ? `${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border shadow-xs`
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            <Radio className={`w-6 h-6 ${form.adsEnabled ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                AdMob Master Status
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                  form.adsEnabled
                    ? `${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {form.adsEnabled ? 'Active (Ads Serving)' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {form.adsEnabled ? 'In-app ads are enabled for Android and iOS' : 'All mobile ads disabled'}
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={form.adsEnabled}
          onClick={() => setForm((p) => ({ ...p, adsEnabled: !p.adsEnabled }))}
          className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            form.adsEnabled ? c.primaryBg : 'bg-slate-200'
          }`}
        >
          <span className="sr-only">Toggle AdMob Status</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              form.adsEnabled ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 2. Platform Switcher & Ad Units (Android & iOS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Ad Unit Configuration by Platform
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure production AdMob App ID and Ad Unit IDs separately for Android and iOS.
            </p>
          </div>

          {/* Platform Tab Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>iOS (Apple)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: ANDROID AD UNITS */}
        {activeTab === 'android' && (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 px-4">
              <span className="text-xs font-semibold text-emerald-800">
                Google Play (Android) Unit IDs
              </span>
              <button
                type="button"
                onClick={loadAndroidTestDefaults}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Load Android Test IDs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Android App ID */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android App ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
                  value={form.androidAppId}
                  onChange={(e) => setForm((p) => ({ ...p, androidAppId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* Android Banner */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Layout className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android Banner ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.androidBannerId}
                  onChange={(e) => setForm((p) => ({ ...p, androidBannerId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* Android Interstitial */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android Interstitial ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.androidInterstitialId}
                  onChange={(e) => setForm((p) => ({ ...p, androidInterstitialId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* Android App Open */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android App Open Splash ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.androidAppOpenId}
                  onChange={(e) => setForm((p) => ({ ...p, androidAppOpenId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* Android Native */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Layout className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android Native ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.androidNativeId}
                  onChange={(e) => setForm((p) => ({ ...p, androidNativeId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* Android Rewarded */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android Rewarded Video ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.androidRewardedId}
                  onChange={(e) => setForm((p) => ({ ...p, androidRewardedId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IOS AD UNITS */}
        {activeTab === 'ios' && (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-xl p-3 px-4">
              <span className="text-xs font-semibold text-blue-800">
                Apple App Store (iOS) Unit IDs
              </span>
              <button
                type="button"
                onClick={loadIosTestDefaults}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Load iOS Test IDs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* iOS App ID */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>iOS App ID (GADApplicationIdentifier)</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
                  value={form.iosAppId}
                  onChange={(e) => setForm((p) => ({ ...p, iosAppId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* iOS Banner */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Layout className="w-3.5 h-3.5 text-blue-600" />
                  <span>iOS Banner ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.iosBannerId}
                  onChange={(e) => setForm((p) => ({ ...p, iosBannerId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* iOS Interstitial */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>iOS Interstitial ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.iosInterstitialId}
                  onChange={(e) => setForm((p) => ({ ...p, iosInterstitialId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* iOS App Open */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>iOS App Open Splash ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.iosAppOpenId}
                  onChange={(e) => setForm((p) => ({ ...p, iosAppOpenId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* iOS Native */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Layout className="w-3.5 h-3.5 text-blue-600" />
                  <span>iOS Native ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.iosNativeId}
                  onChange={(e) => setForm((p) => ({ ...p, iosNativeId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>

              {/* iOS Rewarded */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  <span>iOS Rewarded Video ID</span>
                </label>
                <input
                  type="text"
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                  value={form.iosRewardedId}
                  onChange={(e) => setForm((p) => ({ ...p, iosRewardedId: e.target.value.trim() }))}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer with Save Action */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2.5 text-xs font-bold rounded-xl ${c.primaryBg} ${c.primaryBgHover} text-white shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98`}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Configuration...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Saved Successfully</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Save AdMob Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
