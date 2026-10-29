'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { GeoAd } from '@/lib/types';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';
import { fetchCmsSettings, saveCmsSettings } from '@/lib/storage';
import {
  MapPin,
  Plus,
  Compass,
  ExternalLink,
  Eye,
  MousePointerClick,
  Percent,
  Check,
  X,
  Edit2,
  Trash2,
  Navigation,
  ArrowUpRight,
  Image as ImageIcon,
  Link2,
  Building2,
  Type,
  Radio,
  MessageSquare,
  Save,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface GeoAdsProps {
  ads: GeoAd[];
  onSaveAd: (ad: GeoAd) => void;
  onToggleActive: (adId: string) => void;
  onDeleteAd?: (adId: string) => void;
  searchQuery: string;
}

const CITY_PRESETS = [
  { name: 'Dhaka, BD', lat: 23.8103, lng: 90.4125 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Paris, FR', lat: 48.8566, lng: 2.3522 },
  { name: 'New York, USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Istanbul, TR', lat: 41.0082, lng: 28.9784 },
  { name: 'Kuala Lumpur, MY', lat: 3.1390, lng: 101.6869 },
];

const RADIUS_PRESETS = [15, 50, 100];

export const GeoAds: React.FC<GeoAdsProps> = ({
  ads,
  onSaveAd,
  onToggleActive,
  onDeleteAd,
  searchQuery,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<GeoAd | null>(null);
  const [deleteConfirmAd, setDeleteConfirmAd] = useState<GeoAd | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [latitude, setLatitude] = useState(23.8103);
  const [longitude, setLongitude] = useState(90.4125);
  const [radiusKm, setRadiusKm] = useState(15);
  const [locationName, setLocationName] = useState('Dhaka, BD');

  // CMS Dynamic Notice State
  const [cmsNoticeText, setCmsNoticeText] = useState('Offres et promotions Halal à proximité de vous');
  const [cmsSettings, setCmsSettings] = useState<any>(null);
  const [isSavingCms, setIsSavingCms] = useState(false);
  const [cmsSavedSuccess, setCmsSavedSuccess] = useState(false);

  useEffect(() => {
    fetchCmsSettings().then((settings) => {
      setCmsSettings(settings);
      if (settings?.texts?.geoAdsNoticeText) {
        setCmsNoticeText(settings.texts.geoAdsNoticeText);
      }
    });
  }, []);

  const handleSaveCmsNotice = async () => {
    try {
      setIsSavingCms(true);
      const current = cmsSettings || (await fetchCmsSettings());
      const updated = {
        ...current,
        texts: {
          ...current.texts,
          geoAdsNoticeText: cmsNoticeText.trim(),
        },
      };
      await saveCmsSettings(updated, 'Admin');
      setCmsSettings(updated);
      setCmsSavedSuccess(true);
      toast.success('Geo-Ads promotion text updated and synchronized with mobile app!');
      setTimeout(() => setCmsSavedSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Failed to save CMS text: ' + (err?.message || err));
    } finally {
      setIsSavingCms(false);
    }
  };

  const c = APP_COLORS.classes;
  const inputCls = `w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`;

  const openNewModal = () => {
    setEditingAd(null);
    setTitle('');
    setSponsorName('');
    setBannerImageUrl('');
    setTargetUrl('');
    setLatitude(23.8103);
    setLongitude(90.4125);
    setRadiusKm(15);
    setLocationName('Dhaka, BD');
    setIsModalOpen(true);
  };

  const openEditModal = (ad: GeoAd) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setSponsorName(ad.sponsorName);
    setBannerImageUrl(ad.bannerImageUrl);
    setTargetUrl(ad.targetUrl);
    setLatitude(ad.latitude);
    setLongitude(ad.longitude);
    setRadiusKm(ad.radiusKm);
    setLocationName(ad.locationName);
    setIsModalOpen(true);
  };

  const handlePresetSelect = (preset: { name: string; lat: number; lng: number }) => {
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setLocationName(preset.name);
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', 'GPS Unavailable');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(4)));
        setLongitude(Number(pos.coords.longitude.toFixed(4)));
        setIsLocating(false);
        toast.success('GPS coordinates updated from your current location.', 'Location Detected');
      },
      (err) => {
        setIsLocating(false);
        toast.error(err.message || 'Unable to retrieve your location.', 'GPS Error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAd: GeoAd = {
      id: editingAd ? editingAd.id : `ad-${Date.now()}`,
      title: title.trim(),
      sponsorName: sponsorName.trim(),
      bannerImageUrl: bannerImageUrl.trim(),
      targetUrl: targetUrl.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusKm: Number(radiusKm),
      locationName: locationName.trim() || 'Local Area',
      isActive: editingAd ? editingAd.isActive : true,
      impressionCount: editingAd ? editingAd.impressionCount : 0,
      clickCount: editingAd ? editingAd.clickCount : 0,
      startDate: editingAd ? editingAd.startDate : new Date().toISOString(),
    };

    onSaveAd(newAd);
    toast.success(
      editingAd
        ? `Campaign "${newAd.title}" updated successfully.`
        : `Campaign "${newAd.title}" created and live.`,
      editingAd ? 'Campaign Updated' : 'Campaign Created'
    );
    setIsModalOpen(false);
  };

  const handleToggle = (ad: GeoAd) => {
    onToggleActive(ad.id);
    toast.success(
      ad.isActive
        ? `"${ad.title}" has been paused.`
        : `"${ad.title}" is now active in the mobile app.`,
      ad.isActive ? 'Campaign Paused' : 'Campaign Activated'
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmAd || !onDeleteAd) return;
    onDeleteAd(deleteConfirmAd.id);
    toast.success(`Campaign "${deleteConfirmAd.title}" deleted.`, 'Campaign Deleted');
    setDeleteConfirmAd(null);
  };

  // Summary Stats
  const stats = useMemo(() => {
    const total = ads.length;
    const active = ads.filter((a) => a.isActive).length;
    const impressions = ads.reduce((sum, a) => sum + (a.impressionCount || 0), 0);
    const clicks = ads.reduce((sum, a) => sum + (a.clickCount || 0), 0);
    const avgCtr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0';
    return { total, active, impressions, clicks, avgCtr };
  }, [ads]);

  // Filtered Ads
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ads.filter((a) => {
      if (statusFilter === 'ACTIVE' && !a.isActive) return false;
      if (statusFilter === 'PAUSED' && a.isActive) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.sponsorName.toLowerCase().includes(q) ||
        a.locationName.toLowerCase().includes(q)
      );
    });
  }, [ads, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Top Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
          >
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Geo-Targeted Ads
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  stats.active > 0
                    ? `${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {stats.active} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Broadcast local halal promotions to mobile users within your target GPS radius
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-98 ${c.primaryBg} ${c.primaryBgHover}`}
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Total Campaigns</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600">
            <Compass className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Active Banners</p>
            <p className="text-xl font-bold text-[#088839] mt-1">{stats.active}</p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
          >
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Total Impressions</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {stats.impressions.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Total Clicks (CTR)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-bold text-slate-900">{stats.clicks.toLocaleString()}</p>
              <span className="text-xs font-bold text-emerald-600">({stats.avgCtr}%)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
            <MousePointerClick className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2.5 Dynamic Geo-Ads Text (CMS Editor) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Dynamic Geo-Ads Message (CMS Editor)
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Mobile Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Customizable message, promotional tagline, or instructions displayed to mobile users above nearby local banners.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveCmsNotice}
            disabled={isSavingCms}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-98 ${
              cmsSavedSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : `${c.primaryBg} ${c.primaryBgHover}`
            }`}
          >
            {isSavingCms ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : cmsSavedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved & Synced!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save CMS Text</span>
              </>
            )}
          </button>
        </div>

        {/* Text Input */}
        <div>
          <textarea
            value={cmsNoticeText}
            onChange={(e) => setCmsNoticeText(e.target.value)}
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#088839]/20 focus:border-[#088839] focus:bg-white transition-all font-medium resize-none placeholder:text-slate-400"
            placeholder="e.g. Offres et promotions Halal à proximité de vous..."
          />
        </div>

        {/* Presets & Live Preview */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
            </span>
            {[
              'Offres et promotions Halal à proximité de vous',
              'Bons plans & restaurants certifiés près de vous',
              '-20% ce week-end chez nos partenaires certifiés',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCmsNoticeText(preset)}
                className="text-[10.5px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1">
            <span>Mobile Preview:</span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[260px]">
              📍 {cmsNoticeText || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Pills */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
          {(
            [
              { id: 'ALL', label: `All (${ads.length})` },
              { id: 'ACTIVE', label: `Active (${stats.active})` },
              { id: 'PAUSED', label: `Paused (${ads.length - stats.active})` },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? `${c.primaryBg} text-white shadow-2xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Campaigns Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div
            className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
          >
            <MapPin className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">No geo-targeted campaigns found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create a campaign with target GPS coordinates and a broadcast radius to display local
            partner banners in the mobile app.
          </p>
          <button
            type="button"
            onClick={openNewModal}
            className={`mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer ${c.primaryBg} ${c.primaryBgHover}`}
          >
            <Plus className="w-4 h-4" />
            <span>Create First Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((ad) => {
            const ctr =
              ad.impressionCount > 0
                ? ((ad.clickCount / ad.impressionCount) * 100).toFixed(1)
                : '0.0';

            return (
              <div
                key={ad.id}
                className={`group bg-white border rounded-2xl overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
                  ad.isActive
                    ? 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    : 'border-slate-200/70 opacity-75'
                }`}
              >
                <div>
                  {/* Mobile-Style Banner Preview */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={ad.bannerImageUrl}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Multi-stop gradient scrim matching Flutter GeoAdBannerWidget */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/25" />

                    {/* Top Bar: Featured Partner & Radius Pill */}
                    <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 border border-white/20 backdrop-blur-md">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ad.isActive
                              ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-[10px] font-extrabold text-white tracking-wider uppercase">
                          Featured Partner
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/60 border border-white/20 backdrop-blur-md text-[11px] font-bold text-white">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span>{ad.radiusKm} km radius</span>
                      </div>
                    </div>

                    {/* Bottom Overlay: Sponsor, Headline & Visit Pill */}
                    <div className="absolute bottom-3.5 inset-x-3.5 flex items-end justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-extrabold text-blue-300 uppercase tracking-wider truncate">
                          {ad.sponsorName}
                        </div>
                        <h4 className="text-sm font-extrabold text-white leading-snug line-clamp-2 mt-0.5 drop-shadow-xs">
                          {ad.title}
                        </h4>
                      </div>

                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md text-[11px] font-bold text-white transition-colors"
                      >
                        <span>Visit</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 space-y-4">
                    {/* Location & Target URL Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-[#088839] shrink-0" />
                        <span>{ad.locationName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({ad.latitude.toFixed(4)}, {ad.longitude.toFixed(4)})
                        </span>
                      </div>

                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#088839] font-medium truncate max-w-[200px] transition-colors"
                        title={ad.targetUrl}
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{ad.targetUrl.replace(/^https?:\/\//, '')}</span>
                      </a>
                    </div>

                    {/* Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-xl bg-slate-50/70 border border-slate-200/70 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Impressions</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {ad.impressionCount.toLocaleString()}
                        </div>
                      </div>

                      <div className="border-x border-slate-200/70">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold">
                          <MousePointerClick className="w-3.5 h-3.5 text-slate-400" />
                          <span>Clicks</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {ad.clickCount.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold">
                          <Percent className="w-3.5 h-3.5 text-slate-400" />
                          <span>CTR</span>
                        </div>
                        <div className="text-sm font-bold text-emerald-600 mt-0.5">{ctr}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Status Toggle & Edit/Delete */}
                <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ad.isActive}
                      onClick={() => handleToggle(ad)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        ad.isActive ? c.primaryBg : 'bg-slate-200'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          ad.isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span
                      className={`text-xs font-bold ${
                        ad.isActive ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {ad.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(ad)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {onDeleteAd && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmAd(ad)}
                        className="inline-flex items-center justify-center p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
                >
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAd ? 'Edit Geo Ad Campaign' : 'New Geo Ad Campaign'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Set sponsor details, target GPS coordinates, and broadcast radius
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Mobile App Banner Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Live Mobile Banner Preview</span>
                <span className="text-[#088839]">{radiusKm} km Broadcast Zone</span>
              </div>
              <div className="relative h-36 w-full rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 shadow-xs">
                {bannerImageUrl ? (
                  <img
                    src={bannerImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/25" />

                <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-white/20 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">
                      Featured Partner
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-white/20 backdrop-blur-md text-[10px] font-bold text-white">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span>{locationName || 'Target Area'}</span>
                  </div>
                </div>

                <div className="absolute bottom-3 inset-x-3 flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold text-blue-300 uppercase tracking-wider truncate">
                      {sponsorName || 'Sponsor Name'}
                    </div>
                    <div className="text-sm font-extrabold text-white truncate mt-0.5">
                      {title || 'Campaign Headline'}
                    </div>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-[11px] font-bold text-white">
                    <span>Visit</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Sponsor & Creative Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Type className="w-3.5 h-3.5 text-slate-400" />
                    <span>Campaign Title</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 20% OFF Certified Halal Meat"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sponsor / Business Name</span>
                  </label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="e.g. Al-Amin Halal Mart"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Banner Image URL</span>
                  </label>
                  <input
                    type="url"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Link2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target Redirect URL</span>
                  </label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com/offer"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* GPS Coordinates & Radius Box */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <MapPin className="w-4 h-4 text-[#088839]" />
                    <span>Target GPS Coordinates & Broadcast Radius</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentGps}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e6f4eb] hover:bg-blue-100 text-[#066d2e] border border-[#b5e0c5] text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{isLocating ? 'Detecting GPS...' : 'Use My Current GPS'}</span>
                  </button>
                </div>

                {/* City Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {CITY_PRESETS.map((city) => {
                    const isSelected = locationName === city.name;
                    return (
                      <button
                        key={city.name}
                        type="button"
                        onClick={() => handlePresetSelect(city)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? `${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {city.name}
                      </button>
                    );
                  })}
                </div>

                {/* Location Name, Lat, Lng */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      City / Area Label
                    </label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Dhaka, BD"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#088839]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#088839]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#088839]"
                      required
                    />
                  </div>
                </div>

                {/* Broadcast Radius Slider */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Broadcast Radius</span>
                    <div className="flex items-center gap-1.5">
                      {RADIUS_PRESETS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRadiusKm(r)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            radiusKm === r
                              ? `${c.primaryBg} text-white border-[#088839] shadow-2xs`
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {r} km
                        </button>
                      ))}
                      <span className="ml-1 px-2.5 py-1 rounded-lg bg-[#e6f4eb] border border-[#b5e0c5] text-xs font-extrabold text-[#066d2e]">
                        {radiusKm} km
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="150"
                    step="1"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                    className="w-full accent-[#088839] cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>15 km (Local Area)</span>
                    <span>50 km (City-Wide)</span>
                    <span>100+ km (Regional)</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 ${c.primaryBg} ${c.primaryBgHover}`}
                >
                  <Check className="w-4 h-4" />
                  <span>{editingAd ? 'Save Changes' : 'Create Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deleteConfirmAd && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Campaign?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-700">"{deleteConfirmAd.title}"</span>?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAd(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
