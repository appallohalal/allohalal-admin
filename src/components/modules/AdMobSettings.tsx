'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Apple,
  Save,
  Check,
  Radio,
  Layers,
  Layout,
  Maximize2,
  Sparkles,
  Award,
} from 'lucide-react';
import { AdMobSettings } from '@/lib/types';
import { DEFAULT_ADMOB_SETTINGS } from '@/lib/storage';

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
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save AdMob settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-16">
      {/* 1. Master Ads On/Off Switch Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              form.adsEnabled
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            <Radio className={`w-6 h-6 ${form.adsEnabled ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Master Advertisement Control
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                  form.adsEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {form.adsEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {form.adsEnabled
                ? 'Advertisements are currently active across all mobile client apps.'
                : 'All in-app advertisements are completely disabled for all users.'}
            </p>
          </div>
        </div>

        {/* Premium iOS-style Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={form.adsEnabled}
          onClick={() => setForm((p) => ({ ...p, adsEnabled: !p.adsEnabled }))}
          className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            form.adsEnabled ? 'bg-emerald-600' : 'bg-slate-200'
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

      {/* 2. Ad Unit IDs Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        {/* Header with Platform Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              AdMob Unit Identifiers
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Specify your Google AdMob Application ID and unit identifiers for each mobile platform.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPlatform('android')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                platform === 'android'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('ios')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                platform === 'ios'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iOS</span>
            </button>
          </div>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {/* 1. App ID */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>AdMob App ID ({platform === 'android' ? 'Android' : 'iOS'})</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
              value={platform === 'android' ? form.androidAppId : form.iosAppId}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (platform === 'android') setForm((p) => ({ ...p, androidAppId: val }));
                else setForm((p) => ({ ...p, iosAppId: val }));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 2. Banner Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Layout className="w-3.5 h-3.5 text-slate-500" />
              <span>Banner Ad Unit ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={platform === 'android' ? form.androidBannerId : form.iosBannerId}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (platform === 'android') setForm((p) => ({ ...p, androidBannerId: val }));
                else setForm((p) => ({ ...p, iosBannerId: val }));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 3. Interstitial Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Interstitial Ad Unit ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={platform === 'android' ? form.androidInterstitialId : form.iosInterstitialId}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (platform === 'android') setForm((p) => ({ ...p, androidInterstitialId: val }));
                else setForm((p) => ({ ...p, iosInterstitialId: val }));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 4. App Open Splash Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              <span>App Open Ad Unit ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={platform === 'android' ? form.androidAppOpenId : form.iosAppOpenId}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (platform === 'android') setForm((p) => ({ ...p, androidAppOpenId: val }));
                else setForm((p) => ({ ...p, iosAppOpenId: val }));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 5. Native Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Layout className="w-3.5 h-3.5 text-slate-500" />
              <span>Native Ad Unit ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={platform === 'android' ? form.androidNativeId : form.iosNativeId}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (platform === 'android') setForm((p) => ({ ...p, androidNativeId: val }));
                else setForm((p) => ({ ...p, iosNativeId: val }));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 6. Rewarded Unit ID */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Award className="w-3.5 h-3.5 text-slate-500" />
              <span>Rewarded Video Ad Unit ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={platform === 'android' ? form.androidRewardedId : form.iosRewardedId}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (platform === 'android') setForm((p) => ({ ...p, androidRewardedId: val }));
                else setForm((p) => ({ ...p, iosRewardedId: val }));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer with Save Action */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Changes Saved</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
