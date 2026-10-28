'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Send, RefreshCw } from 'lucide-react';
import { NotificationSettings, PushNotification, UserAccount } from '@/lib/types';
import {
  fetchNotificationData,
  sendPushNotification,
  setNotificationsEnabled,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/lib/storage';
import { toast } from '@/lib/toast';

interface NotificationManagerProps {
  currentUser?: { name?: string };
  users?: UserAccount[];
}

const clean = (v?: string) => (v || '').trim();

export const NotificationManager: React.FC<NotificationManagerProps> = ({ currentUser, users = [] }) => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isToggling, setIsToggling] = useState(false);

  // Campaign form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchNotificationData().then((data) => {
      setSettings(data.settings);
    });
  }, []);

  // Country / City options come from user profiles
  const countries = useMemo(
    () => Array.from(new Set(users.map((u) => clean(u.country)).filter((c) => c && c !== 'Unknown'))).sort(),
    [users]
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .filter((u) => clean(u.country) === country)
            .map((u) => clean(u.city))
            .filter(Boolean)
        )
      ).sort(),
    [users, country]
  );

  const audienceCount = useMemo(
    () =>
      users.filter(
        (u) => !country || (clean(u.country) === country && (!city || clean(u.city) === city))
      ).length,
    [users, country, city]
  );

  const handleToggle = async () => {
    const next = !settings.isEnabled;
    setIsToggling(true);
    try {
      await setNotificationsEnabled(next, currentUser?.name || 'Admin');
      setSettings((s) => ({ ...s, isEnabled: next }));
      toast.success(next ? 'Push notifications enabled.' : 'Push notifications disabled.', 'Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update toggle.', 'Error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    if (!settings.isEnabled) {
      toast.error('Push notifications are turned off.', 'Disabled');
      return;
    }

    setIsSending(true);
    try {
      await sendPushNotification({
        title: title.trim(),
        message: message.trim(),
        url: link.trim() || undefined,
        country: country || undefined,
        city: city || undefined,
        sentBy: currentUser?.name || 'Admin',
      });
      toast.success('Notification sent via Firebase FCM.', 'Delivered');
      setTitle('');
      setMessage('');
      setLink('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send notification.', 'Error');
    } finally {
      setIsSending(false);
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#088839] focus:ring-2 focus:ring-[#088839]/10 outline-none transition';
  const canSend = settings.isEnabled && !isSending && title.trim() && message.trim();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#088839] flex items-center justify-center text-white">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Push Notifications</h1>
            <p className="text-xs text-slate-500">Powered by Firebase Cloud Messaging (FCM)</p>
          </div>
        </div>
      </div>

      {/* Global Feature Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-800">Enable Push Notifications</div>
          <div className="text-xs text-slate-500">
            {settings.isEnabled ? 'On — FCM campaigns can be sent and devices receive them.' : 'Off — nothing is sent or shown to users.'}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.isEnabled}
          disabled={isToggling}
          onClick={handleToggle}
          className={`relative w-12 h-7 rounded-full transition cursor-pointer disabled:opacity-60 ${
            settings.isEnabled ? 'bg-[#088839]' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              settings.isEnabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Campaign */}
      <form
        onSubmit={handleSend}
        className={`bg-white rounded-2xl border border-slate-200 p-6 space-y-4 ${
          settings.isEnabled ? '' : 'opacity-60'
        }`}
      >
        <h2 className="text-sm font-bold text-slate-800">New Campaign</h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputCls} resize-none`}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Link <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Country</label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity('');
              }}
              className={inputCls}
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!country}
              className={`${inputCls} disabled:opacity-50`}
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Audience: {country ? (city ? `${city}, ${country}` : country) : 'All users'} · {audienceCount} registered
          {audienceCount === 1 ? ' user' : ' users'}
        </p>

        <button
          type="submit"
          disabled={!canSend}
          className={`w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition ${
            canSend ? 'bg-[#088839] hover:bg-[#066d2e] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSending ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
    </div>
  );
};
