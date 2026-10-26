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
} from 'lucide-react';
import { AdMobSettings } from '@/lib/types';
import { DEFAULT_ADMOB_SETTINGS } from '@/lib/storage';

import { APP_COLORS } from '@/lib/colors';

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
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save AdMob settings:', err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
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
                AdMob Status
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                  form.adsEnabled
                    ? `${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {form.adsEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {form.adsEnabled ? 'Ads active in mobile app' : 'Ads disabled'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
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

      {/* 2. Ad Unit IDs Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Ad Units
          </h3>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {/* 1. App ID */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>App ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
              value={form.androidAppId}
              onChange={(e) => setForm((p) => ({ ...p, androidAppId: e.target.value.trim() }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
            />
          </div>

          {/* 2. Banner Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Layout className="w-3.5 h-3.5 text-slate-500" />
              <span>Banner ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={form.androidBannerId}
              onChange={(e) => setForm((p) => ({ ...p, androidBannerId: e.target.value.trim() }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
            />
          </div>

          {/* 3. Interstitial Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Interstitial ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={form.androidInterstitialId}
              onChange={(e) => setForm((p) => ({ ...p, androidInterstitialId: e.target.value.trim() }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
            />
          </div>

          {/* 4. App Open Splash Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              <span>App Open ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={form.androidAppOpenId}
              onChange={(e) => setForm((p) => ({ ...p, androidAppOpenId: e.target.value.trim() }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
            />
          </div>

          {/* 5. Native Unit ID */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Layout className="w-3.5 h-3.5 text-slate-500" />
              <span>Native ID</span>
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
              value={form.androidNativeId}
              onChange={(e) => setForm((p) => ({ ...p, androidNativeId: e.target.value.trim() }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`}
            />
          </div>

          {/* 6. Rewarded Unit ID */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Award className="w-3.5 h-3.5 text-slate-500" />
              <span>Rewarded ID</span>
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
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
