'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { DashboardOverview } from '@/components/modules/DashboardOverview';
import { ProductCatalog } from '@/components/modules/ProductCatalog';
import { AdditivesDictionary } from '@/components/modules/AdditivesDictionary';
import { UserManagement } from '@/components/modules/UserManagement';
import { AdminManagement } from '@/components/modules/AdminManagement';
import { GeoAds } from '@/components/modules/GeoAds';
import { AnalyticsDashboard } from '@/components/modules/AnalyticsDashboard';
import { GroqLogs } from '@/components/modules/GroqLogs';
import { AdMobSettingsView } from '@/components/modules/AdMobSettings';
import { AuthPage } from '@/components/auth/AuthPage';
import { AdminUser, getStoredAuthUser, logoutAdmin } from '@/lib/auth';

import {
  fetchProducts,
  updateProductStatus,
  fetchAdditives,
  saveAdditive,
  deleteAdditive,
  fetchUsers,
  toggleUserBan,
  toggleUserPremium,
  fetchAds,
  saveGeoAd,
  toggleAdActive,
  fetchLogs,
  fetchAdMobSettings,
  saveAdMobSettings,
  DEFAULT_ADMOB_SETTINGS,
  fetchGroqSettings,
  saveGroqSettings,
  DEFAULT_GROQ_SETTINGS,
} from '@/lib/storage';
import { Product, Additive, UserAccount, GeoAd, GroqApiLog, HalalStatus, AdMobSettings, GroqSettings } from '@/lib/types';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Supabase data state
  const [products, setProducts] = useState<Product[]>([]);
  const [additives, setAdditives] = useState<Additive[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [ads, setAds] = useState<GeoAd[]>([]);
  const [logs, setLogs] = useState<GroqApiLog[]>([]);
  const [admobSettings, setAdmobSettings] = useState<AdMobSettings>(DEFAULT_ADMOB_SETTINGS);
  const [groqSettings, setGroqSettings] = useState<GroqSettings>(DEFAULT_GROQ_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize data and real Supabase Auth session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuthAndData() {
      try {
        const user = await getStoredAuthUser();
        if (isMounted) {
          setCurrentUser(user);
        }

        const [prods, adds, usrs, adList, logList, admob, groq] = await Promise.all([
          fetchProducts(),
          fetchAdditives(),
          fetchUsers(),
          fetchAds(),
          fetchLogs(),
          fetchAdMobSettings(),
          fetchGroqSettings(),
        ]);
        if (isMounted) {
          setProducts(prods);
          setAdditives(adds);
          setUsers(usrs);
          setAds(adList);
          setLogs(logList);
          setAdmobSettings(admob);
          setGroqSettings(groq);
        }
      } catch (err) {
        console.error('Error loading Supabase data:', err);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    initAuthAndData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handlers connected to Supabase
  const handleUpdateProductStatus = async (
    productId: string,
    status: HalalStatus,
    note: string,
    verifiedBy: string
  ) => {
    const updated = await updateProductStatus(productId, status, note, verifiedBy);
    setProducts(updated);
  };

  const handleQuickVerify = async (productId: string, status: HalalStatus) => {
    const defaultNote =
      status === 'HALAL'
        ? 'Verified 100% Halal by Auditor Review'
        : 'Flagged as Haram due to non-compliant ingredients';
    const updated = await updateProductStatus(
      productId,
      status,
      defaultNote,
      currentUser?.name || 'Chief Auditor'
    );
    setProducts(updated);
  };

  const handleSaveAdditive = async (additive: Additive) => {
    const updated = await saveAdditive(additive);
    setAdditives(updated);
  };

  const handleDeleteAdditive = async (id: string) => {
    const updated = await deleteAdditive(id);
    setAdditives(updated);
  };

  const handleToggleBan = async (userId: string, reason?: string) => {
    const updated = await toggleUserBan(userId, reason);
    setUsers(updated);
  };

  const handleTogglePremium = async (userId: string) => {
    const updated = await toggleUserPremium(userId);
    setUsers(updated);
  };

  const handleSaveAd = async (ad: GeoAd) => {
    const updated = await saveGeoAd(ad);
    setAds(updated);
  };

  const handleToggleAdActive = async (adId: string) => {
    const updated = await toggleAdActive(adId);
    setAds(updated);
  };

  const handleSaveAdMob = async (newSettings: AdMobSettings) => {
    const updated = await saveAdMobSettings(newSettings, currentUser?.name || 'Admin');
    setAdmobSettings(updated);
  };

  const handleSaveGroqSettings = async (newSettings: GroqSettings) => {
    const updated = await saveGroqSettings(newSettings, currentUser?.name || 'Admin');
    setGroqSettings(updated);
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setCurrentUser(null);
  };

  if (!isLoaded) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-600">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show Login & Register view
  if (!currentUser) {
    return <AuthPage onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  // Sidebar live counts
  const counts = {
    pendingReviews: products.filter((p) => (p.manualStatus || p.aiStatus) === 'MUSHBOOH').length,
    totalAdditives: additives.length,
    bannedUsers: users.filter((u) => u.isBanned).length,
    activeAds: ads.filter((a) => a.isActive).length,
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex">
      {/* Fixed Sticky Left Sidebar: NEVER scrolls with page */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSearchQuery('');
        }}
        counts={counts}
      />

      {/* Main Content Area with Header and scrollable viewport */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* ONLY this main element scrolls vertically */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardOverview
                products={products}
                additives={additives}
                users={users}
                ads={ads}
                logs={logs}
                currentUser={currentUser}
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                  setSearchQuery('');
                }}
                onQuickVerify={handleQuickVerify}
              />
            )}

            {activeTab === 'products' && (
              <ProductCatalog
                products={products}
                onUpdateStatus={handleUpdateProductStatus}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'additives' && (
              <AdditivesDictionary
                additives={additives}
                onSaveAdditive={handleSaveAdditive}
                onDeleteAdditive={handleDeleteAdditive}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'users' && (
              <UserManagement
                users={users}
                onToggleBan={handleToggleBan}
                onTogglePremium={handleTogglePremium}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'admins' && (
              <AdminManagement
                currentUser={currentUser}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'admob' && (
              <AdMobSettingsView
                settings={admobSettings}
                onSave={handleSaveAdMob}
                currentUser={currentUser || undefined}
              />
            )}

            {activeTab === 'ads' && (
              <GeoAds
                ads={ads}
                onSaveAd={handleSaveAd}
                onToggleActive={handleToggleAdActive}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                products={products}
                users={users}
                additives={additives}
              />
            )}

            {activeTab === 'logs' && (
              <GroqLogs
                logs={logs}
                settings={groqSettings}
                onSaveSettings={handleSaveGroqSettings}
                onRefreshLogs={async () => {
                  const updatedLogs = await fetchLogs();
                  setLogs(updatedLogs);
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
