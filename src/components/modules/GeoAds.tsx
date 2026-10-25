'use client';

import React, { useState } from 'react';
import { GeoAd } from '@/lib/types';
import {
  MapPin,
  Plus,
  Compass,
  ExternalLink,
  Eye,
  MousePointerClick,
  Percent,
  Sliders,
  Check,
  X,
  Edit2,
  Trash2,
  Power,
  Globe,
} from 'lucide-react';

interface GeoAdsProps {
  ads: GeoAd[];
  onSaveAd: (ad: GeoAd) => void;
  onToggleActive: (adId: string) => void;
  searchQuery: string;
}

const CITY_PRESETS = [
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Dhaka, BD', lat: 23.8103, lng: 90.4125 },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'New York, USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Istanbul, TR', lat: 41.0082, lng: 28.9784 },
  { name: 'Kuala Lumpur, MY', lat: 3.1390, lng: 101.6869 },
  { name: 'Paris, FR', lat: 48.8566, lng: 2.3522 },
];

export const GeoAds: React.FC<GeoAdsProps> = ({
  ads,
  onSaveAd,
  onToggleActive,
  searchQuery,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<GeoAd | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [latitude, setLatitude] = useState(23.8103);
  const [longitude, setLongitude] = useState(90.4125);
  const [radiusKm, setRadiusKm] = useState(15.0);
  const [locationName, setLocationName] = useState('Dhaka Metropolitan Area');

  const openNewModal = () => {
    setEditingAd(null);
    setTitle('Al-Amin Halal Butchers & Grocers');
    setSponsorName('Al-Amin Foods');
    setBannerImageUrl('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80');
    setTargetUrl('https://example.com/halal-discount');
    setLatitude(23.8103);
    setLongitude(90.4125);
    setRadiusKm(15.0);
    setLocationName('Dhaka, Bangladesh');
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
      locationName: locationName.trim(),
      isActive: editingAd ? editingAd.isActive : true,
      impressionCount: editingAd ? editingAd.impressionCount : 0,
      clickCount: editingAd ? editingAd.clickCount : 0,
      startDate: editingAd ? editingAd.startDate : new Date().toISOString(),
    };

    onSaveAd(newAd);
    setIsModalOpen(false);
  };

  const filtered = ads.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.sponsorName.toLowerCase().includes(q) ||
      a.locationName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
            <Compass className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Geo-Targeted Ads & Local Partnerships
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                PostGIS Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Serve local halal grocery, butcher, and restaurant promotions based on mobile user GPS latitude, longitude, and radius.
            </p>
          </div>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Create Geo Ad Campaign
        </button>
      </div>

      {/* Ads Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No active geo-targeted ad campaigns</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Create Geo Ad Campaign" to target local mobile users within a kilometer radius.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((ad) => {
            const ctr = ad.impressionCount > 0 ? ((ad.clickCount / ad.impressionCount) * 100).toFixed(1) : '0.0';

            return (
              <div
              key={ad.id}
              className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition-all ${
                ad.isActive
                  ? 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  : 'border-slate-200/60 opacity-60'
              }`}
            >
              {/* Banner Image Preview */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                <img
                  src={ad.bannerImageUrl}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Status chip */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                      ad.isActive
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {ad.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </div>

                {/* Location Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200/80 backdrop-blur-sm text-xs font-bold text-slate-800 shadow-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>{ad.locationName}</span>
                  <span className="text-slate-500 font-medium">• Radius: {ad.radiusKm} km</span>
                </div>
              </div>

              {/* Ad Info & Metrics */}
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    {ad.sponsorName}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">{ad.title}</h4>
                  <a
                    href={ad.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium mt-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> {ad.targetUrl}
                  </a>
                </div>

                {/* GPS Coordinates & PostGIS specs */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-600 font-medium">
                    GPS: {ad.latitude.toFixed(4)}, {ad.longitude.toFixed(4)}
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">
                    ST_DWithin ({ad.radiusKm}km)
                  </span>
                </div>

                {/* Analytics Counters */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Eye className="w-3 h-3" /> Impressions
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {ad.impressionCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                      <MousePointerClick className="w-3 h-3" /> Clicks
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {ad.clickCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Percent className="w-3 h-3" /> CTR
                    </div>
                    <div className="text-sm font-bold text-emerald-700 mt-0.5">{ctr}%</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onToggleActive(ad.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      ad.isActive
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {ad.isActive ? 'Pause Banner' : 'Activate Banner'}
                  </button>

                  <button
                    onClick={() => openEditModal(ad)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT GEO AD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Compass className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAd ? 'Edit Geo-Targeted Campaign' : 'Create New Geo-Targeted Ad'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure sponsor details, banner graphic, GPS coordinates, and broadcast radius.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Campaign Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 15% OFF Certified Halal Meat"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Sponsor / Business Name</label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="e.g. Medina Gourmet Butcher"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Banner Image URL</label>
                  <input
                    type="url"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Redirect Link (Target URL)</label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Geo Location & PostGIS Radius Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                    <MapPin className="w-4 h-4 text-blue-600" /> GPS Target Coordinates & Radius
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Select city preset or type lat/lng</span>
                </div>

                {/* City Preset Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {CITY_PRESETS.map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handlePresetSelect(city)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Target Region Name</label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Latitude (GPS)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-900"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Longitude (GPS)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* Radius Slider */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-bold">Broadcast Radius:</span>
                    <span className="font-bold text-blue-700">{radiusKm} Kilometers</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>1 km (Hyperlocal neighborhood)</span>
                    <span>50 km (City wide)</span>
                    <span>100 km (Regional)</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
