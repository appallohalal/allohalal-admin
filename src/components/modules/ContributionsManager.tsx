'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Coffee,
  Server,
  TrendingUp,
  Crown,
  DollarSign,
  Search,
  Filter,
  Trash2,
  Copy,
  CreditCard,
  MapPin,
  Mail,
  Calendar,
  ShieldCheck,
  Info,
  X,
  FileText,
  SlidersHorizontal,
  Plus,
  HandHeart,
  Save,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  Lock,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { Contribution, DonationTier, AuthSettings } from '@/lib/types';
import { DEFAULT_AUTH_SETTINGS } from '@/lib/storage';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';

interface ContributionsManagerProps {
  contributions: Contribution[];
  onDelete: (contributionId: string) => Promise<void> | void;
  currentAdminName?: string;
  searchQuery?: string;
  isContributionsEnabled?: boolean;
  onToggleContributions?: (enabled: boolean) => Promise<void> | void;
  authSettings?: AuthSettings;
  onSaveAuthSettings?: (settings: AuthSettings) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}

export const ContributionsManager: React.FC<ContributionsManagerProps> = ({
  contributions = [],
  onDelete,
  currentAdminName = 'Senior Halal Auditor',
  searchQuery = '',
  isContributionsEnabled = true,
  onToggleContributions,
  authSettings,
  onSaveAuthSettings,
  onRefresh,
}) => {
  const c = APP_COLORS.classes;
  const inputCls = `w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400 font-medium`;

  // Filters State
  const [tierFilter, setTierFilter] = useState<'ALL' | DonationTier>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D' | 'THIS_MONTH'>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Pagination: Show the latest 10 records per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Actions State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Contribution | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Configuration Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'PADDLE' | 'TIERS' | 'HUMANITARIAN'>('PADDLE');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Form State for Payment Gateway (Paddle Billing)
  const [enablePaddle, setEnablePaddle] = useState<boolean>(
    authSettings?.enablePaddle !== false
  );
  const [paddleMode, setPaddleMode] = useState<'sandbox' | 'live'>(
    authSettings?.paddleMode || 'sandbox'
  );
  const [paddleClientToken, setPaddleClientToken] = useState<string>(
    (authSettings?.paddleClientToken && !authSettings.paddleClientToken.startsWith('pk_'))
      ? authSettings.paddleClientToken
      : (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || DEFAULT_AUTH_SETTINGS.paddleClientToken || '')
  );
  const [paddleApiKey, setPaddleApiKey] = useState<string>(
    (authSettings?.paddleApiKey && !authSettings.paddleApiKey.startsWith('sk_'))
      ? authSettings.paddleApiKey
      : (DEFAULT_AUTH_SETTINGS.paddleApiKey || '')
  );
  const [paddleCurrency, setPaddleCurrency] = useState<string>(
    authSettings?.paddleCurrency || 'eur'
  );
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingPaddle, setIsTestingPaddle] = useState<boolean>(false);
  const [paddleTestResult, setPaddleTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isRefreshingServer, setIsRefreshingServer] = useState<boolean>(false);
  const [isSyncingPaddle, setIsSyncingPaddle] = useState<boolean>(false);

  const handleSyncPaddle = async () => {
    setIsSyncingPaddle(true);
    try {
      const res = await fetch('/api/paddle/sync-transactions', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Transactions synchronized from Paddle!');
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        toast.error(data.error || 'Failed to sync with Paddle');
      }
    } catch (err: any) {
      toast.error('Network error syncing with Paddle: ' + err.message);
    } finally {
      setIsSyncingPaddle(false);
    }
  };

  // Form State for Presets & Tiers Configuration
  const [presets, setPresets] = useState<number[]>(
    authSettings?.contributionPresets || [1, 3, 5, 10, 15]
  );
  const [newPresetInput, setNewPresetInput] = useState('');
  const [defaultAmount, setDefaultAmount] = useState<number>(
    authSettings?.defaultContributionAmount || 5
  );
  const [minAmount, setMinAmount] = useState<number>(
    authSettings?.minContributionAmount || 1
  );
  const [maxAmount, setMaxAmount] = useState<number>(
    authSettings?.maxContributionAmount || 50
  );
  const [currency, setCurrency] = useState<string>(
    authSettings?.contributionCurrency || 'EUR'
  );
  const [coffeeMax, setCoffeeMax] = useState<number>(
    authSettings?.coffeeMaxAmount || 2
  );
  const [serverMax, setServerMax] = useState<number>(
    authSettings?.serverMaxAmount || 4
  );
  const [growthMax, setGrowthMax] = useState<number>(
    authSettings?.growthMaxAmount || 9
  );

  // Form State for Humanitarian Commitment & Solidarity
  const [enableHumanitarian, setEnableHumanitarian] = useState<boolean>(
    authSettings?.enableHumanitarianCommitment !== false
  );
  const [humanitarianTitle, setHumanitarianTitle] = useState<string>(
    authSettings?.humanitarianTitle || 'Humanitarian Commitment & Solidarity'
  );
  const [humanitarianBadge, setHumanitarianBadge] = useState<string>(
    authSettings?.humanitarianBadge || 'Charity Redistribution Partner'
  );
  const [humanitarianCharityShare, setHumanitarianCharityShare] = useState<string>(
    authSettings?.humanitarianCharityShare || '20% Redistributed to Charity'
  );
  const [humanitarianText, setHumanitarianText] = useState<string>(
    authSettings?.humanitarianText ||
      'Allo Halal is driven by ethical and community values. In the spirit of Islamic solidarity, a dedicated portion of every free-will contribution is redirected towards verified humanitarian partners to provide emergency food aid and clean water for vulnerable families worldwide.'
  );
  const [humanitarianOrg, setHumanitarianOrg] = useState<string>(
    authSettings?.humanitarianOrganizationName || 'Global Halal Emergency Food Relief'
  );
  const [humanitarianUrl, setHumanitarianUrl] = useState<string>(
    authSettings?.humanitarianLearnMoreUrl || 'https://allohalal.fr/humanitarian'
  );

  // Sync state whenever authSettings prop changes
  useEffect(() => {
    if (authSettings) {
      if (authSettings.contributionPresets && authSettings.contributionPresets.length > 0) {
        setPresets(authSettings.contributionPresets);
      }
      if (authSettings.defaultContributionAmount) {
        setDefaultAmount(authSettings.defaultContributionAmount);
      }
      if (authSettings.minContributionAmount) setMinAmount(authSettings.minContributionAmount);
      if (authSettings.maxContributionAmount) setMaxAmount(authSettings.maxContributionAmount);
      if (authSettings.contributionCurrency) setCurrency(authSettings.contributionCurrency);
      if (authSettings.coffeeMaxAmount) setCoffeeMax(authSettings.coffeeMaxAmount);
      if (authSettings.serverMaxAmount) setServerMax(authSettings.serverMaxAmount);
      if (authSettings.growthMaxAmount) setGrowthMax(authSettings.growthMaxAmount);

      setEnableHumanitarian(authSettings.enableHumanitarianCommitment !== false);
      if (authSettings.humanitarianTitle) setHumanitarianTitle(authSettings.humanitarianTitle);
      if (authSettings.humanitarianBadge) setHumanitarianBadge(authSettings.humanitarianBadge);
      if (authSettings.humanitarianCharityShare) setHumanitarianCharityShare(authSettings.humanitarianCharityShare);
      if (authSettings.humanitarianText) setHumanitarianText(authSettings.humanitarianText);
      if (authSettings.humanitarianOrganizationName) setHumanitarianOrg(authSettings.humanitarianOrganizationName);
      if (authSettings.humanitarianLearnMoreUrl) setHumanitarianUrl(authSettings.humanitarianLearnMoreUrl);

      setEnablePaddle(authSettings.enablePaddle !== false);
      if (authSettings.paddleMode) setPaddleMode(authSettings.paddleMode);

      const effectiveClientToken =
        authSettings.paddleClientToken && !authSettings.paddleClientToken.startsWith('pk_')
          ? authSettings.paddleClientToken
          : (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || DEFAULT_AUTH_SETTINGS.paddleClientToken);
      if (effectiveClientToken) setPaddleClientToken(effectiveClientToken);

      const effectiveApiKey =
        authSettings.paddleApiKey && !authSettings.paddleApiKey.startsWith('sk_')
          ? authSettings.paddleApiKey
          : DEFAULT_AUTH_SETTINGS.paddleApiKey;
      if (effectiveApiKey) setPaddleApiKey(effectiveApiKey);

      if (authSettings.paddleCurrency) setPaddleCurrency(authSettings.paddleCurrency);
    }
  }, [authSettings]);

  // Purge any legacy demo static records from browser localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('halallens_supabase_contributions');
        if (cached) {
          const list = JSON.parse(cached);
          if (
            Array.isArray(list) &&
            list.some((item: any) => item.id === 'don_1' || item.donorName === 'Tariq Mansoor')
          ) {
            localStorage.removeItem('halallens_supabase_contributions');
            if (onRefresh) onRefresh();
          }
        }
      } catch (_) {}
    }
  }, [onRefresh]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tierFilter, paymentFilter, dateRangeFilter, localSearch, searchQuery]);

  // Filter items
  const q = (localSearch || searchQuery).toLowerCase().trim();
  const filteredDonations = contributions.filter((item) => {
    if (tierFilter !== 'ALL' && item.tier !== tierFilter) return false;
    if (paymentFilter !== 'ALL' && item.paymentMethod !== paymentFilter) return false;

    // Date Range Filter
    if (dateRangeFilter !== 'ALL') {
      const itemDate = new Date(item.createdAt);
      const now = new Date();
      if (dateRangeFilter === 'TODAY') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (itemDate < todayStart) return false;
      } else if (dateRangeFilter === '7D') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (itemDate < sevenDaysAgo) return false;
      } else if (dateRangeFilter === '30D') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (itemDate < thirtyDaysAgo) return false;
      } else if (dateRangeFilter === 'THIS_MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (itemDate < monthStart) return false;
      }
    }

    if (q) {
      const match =
        (item.donorName || '').toLowerCase().includes(q) ||
        (item.donorEmail || '').toLowerCase().includes(q) ||
        (item.donorLocation && item.donorLocation.toLowerCase().includes(q)) ||
        (item.transactionId && item.transactionId.toLowerCase().includes(q)) ||
        (item.message && item.message.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Sort items
  const sortedDonations = [...filteredDonations].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'date_asc') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'amount_desc') {
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    }
    if (sortBy === 'amount_asc') {
      return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    }
    return 0;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(sortedDonations.length / itemsPerPage) || 1;
  const paginatedDonations = sortedDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Financial KPI Calculations
  const totalFunds = contributions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const totalCount = contributions.length;
  const avgDonation = totalCount > 0 ? (totalFunds / totalCount).toFixed(2) : '0.00';
  const patronCount = contributions.filter((c) => c.tier === 'PATRON' || c.tier === 'GROWTH').length;

  // Filtered Ledger Total
  const ledgerTotal = sortedDonations.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  const handleToggle = async () => {
    if (!onToggleContributions) return;
    setIsToggling(true);
    try {
      await onToggleContributions(!isContributionsEnabled);
      toast.success(
        !isContributionsEnabled
          ? 'Donations feature activated for mobile app users.'
          : 'Donations feature disabled in mobile app.',
        'Policy Updated'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle contributions setting.', 'Error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      await onDelete(deleteConfirmItem.id);
      toast.success('Donation record permanently deleted.', 'Deleted');
      setDeleteConfirmItem(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete donation record.', 'Error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard.`);
    }
  };

  // Export to CSV for audit and accounting
  const exportToCsv = () => {
    if (sortedDonations.length === 0) {
      toast.error('No payment records to export.');
      return;
    }
    const headers = [
      'Transaction ID',
      'Donor Name',
      'Donor Email',
      'Donor Location',
      'Amount',
      'Currency',
      'Support Tier',
      'Payment Method',
      'Is Anonymous',
      'Donor Message',
      'Date & Time',
    ];
    const rows = sortedDonations.map((d) => [
      `"${d.transactionId || d.id}"`,
      `"${(d.donorName || 'Anonymous').replace(/"/g, '""')}"`,
      `"${(d.donorEmail || '').replace(/"/g, '""')}"`,
      `"${(d.donorLocation || '').replace(/"/g, '""')}"`,
      (Number(d.amount) || 0).toFixed(2),
      d.currency || 'EUR',
      d.tier || 'SERVER',
      d.paymentMethod || 'PADDLE',
      d.isAnonymous ? 'Yes' : 'No',
      `"${(d.message || '').replace(/"/g, '""')}"`,
      `"${new Date(d.createdAt).toISOString()}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contributions-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Contributions history exported as CSV.', 'Export Complete');
  };

  // Preset configuration handlers
  const handleAddPreset = () => {
    const val = parseFloat(newPresetInput.trim());
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid positive number for the preset amount.');
      return;
    }
    if (presets.includes(val)) {
      toast.error(`Preset €${val} already exists.`);
      return;
    }
    const updated = [...presets, val].sort((a, b) => a - b);
    setPresets(updated);
    setNewPresetInput('');
    toast.success(`Added €${val} to contribution presets.`);
  };

  const handleRemovePreset = (val: number) => {
    if (presets.length <= 1) {
      toast.error('You must keep at least one preset amount.');
      return;
    }
    const updated = presets.filter((p) => p !== val);
    setPresets(updated);
    if (defaultAmount === val) {
      setDefaultAmount(updated[0]);
    }
  };

  const handleResetToDefaultPresets = () => {
    setPresets([1, 3, 5, 10, 15]);
    setDefaultAmount(5);
    setCoffeeMax(2);
    setServerMax(4);
    setGrowthMax(9);
    toast.success('Presets reset to standard €1, €3, €5, €10, €15.');
  };

  const handleTestPaddleConnection = async () => {
    if (!paddleApiKey.trim()) {
      toast.error('Please enter your Paddle API Key to test connection.');
      return;
    }
    setIsTestingPaddle(true);
    setPaddleTestResult(null);
    try {
      const res = await fetch('/api/paddle/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: paddleApiKey, mode: paddleMode }),
      });
      const data = await res.json();
      if (data.success) {
        setPaddleTestResult({
          success: true,
          message: data.message || `Connected to Paddle in ${data.mode.toUpperCase()} mode!`,
        });
        toast.success(data.message || 'Paddle API key validated successfully.', 'Paddle Verified');
      } else {
        setPaddleTestResult({
          success: false,
          message: data.error || 'Failed to authenticate with Paddle.',
        });
        toast.error(data.error || 'Failed to authenticate with Paddle.', 'Paddle Auth Failed');
      }
    } catch (err: any) {
      setPaddleTestResult({
        success: false,
        message: err.message || 'Network error while testing connection.',
      });
      toast.error(err.message || 'Network error while testing connection.', 'Connection Error');
    } finally {
      setIsTestingPaddle(false);
    }
  };

  const handleRefreshServer = async () => {
    setIsRefreshingServer(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      toast.success('Loaded real contributions from server database.', 'Server Data Updated');
    } catch (err: any) {
      toast.error(err?.message || 'Could not load data from server.', 'Refresh Failed');
    } finally {
      setIsRefreshingServer(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!onSaveAuthSettings || !authSettings) {
      toast.error('Unable to save settings: auth settings handler unavailable.');
      return;
    }

    if (presets.length === 0) {
      toast.error('Please specify at least one preset amount.');
      return;
    }

    setIsSavingConfig(true);
    try {
      const updatedPayload: AuthSettings = {
        ...authSettings,
        contributionPresets: presets,
        defaultContributionAmount: defaultAmount,
        minContributionAmount: minAmount,
        maxContributionAmount: maxAmount,
        contributionCurrency: currency,
        coffeeMaxAmount: coffeeMax,
        serverMaxAmount: serverMax,
        growthMaxAmount: growthMax,
        enableHumanitarianCommitment: enableHumanitarian,
        humanitarianTitle: humanitarianTitle.trim(),
        humanitarianBadge: humanitarianBadge.trim(),
        humanitarianCharityShare: humanitarianCharityShare.trim(),
        humanitarianText: humanitarianText.trim(),
        humanitarianOrganizationName: humanitarianOrg.trim(),
        humanitarianLearnMoreUrl: humanitarianUrl.trim(),
        enablePaddle: enablePaddle,
        paddleMode: paddleMode,
        paddleApiKey: paddleApiKey.trim(),
        paddleClientToken: paddleClientToken.trim(),
        paddleCurrency: paddleCurrency.trim().toLowerCase(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentAdminName || 'Admin',
      };

      await onSaveAuthSettings(updatedPayload);
      toast.success(
        'Contribution presets & humanitarian commitment settings updated successfully.',
        'Configuration Saved'
      );
      setIsConfigModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save contribution settings.', 'Save Error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const getTierBadge = (tier: DonationTier) => {
    switch (tier) {
      case 'COFFEE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Coffee className="w-3 h-3 text-amber-600" />
            Coffee (&le; {coffeeMax}€)
          </span>
        );
      case 'SERVER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Server className="w-3 h-3 text-blue-600" />
            Server (&le; {serverMax}€)
          </span>
        );
      case 'GROWTH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <TrendingUp className="w-3 h-3 text-purple-600" />
            Growth (&le; {growthMax}€)
          </span>
        );
      case 'PATRON':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder} border`}>
            <Crown className={`w-3 h-3 ${c.primaryText}`} />
            Patron (&gt; {growthMax}€)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Supporter
          </span>
        );
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'PADDLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            <CreditCard className="w-3 h-3 text-emerald-500" />
            Paddle
          </span>
        );
      case 'STRIPE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
            <CreditCard className="w-3 h-3 text-indigo-500" />
            Stripe
          </span>
        );
      case 'PAYPAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 font-mono">
            <CreditCard className="w-3 h-3 text-sky-500" />
            PayPal
          </span>
        );
      case 'APPLE_PAY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 text-white font-mono">
            Apple Pay
          </span>
        );
      case 'GOOGLE_PAY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300 font-mono">
            Google Pay
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Top Policy & Configuration Cards (Clean Responsive Pattern) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card A: Donations Gateway Toggle */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center transition-all ${
                isContributionsEnabled
                  ? `${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border shadow-xs`
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              <HeartHandshake className={`w-5 h-5 ${isContributionsEnabled ? 'animate-pulse' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Donations Feature
                </h2>
                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={isToggling}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer hover:opacity-80 flex items-center gap-1 ${
                    isContributionsEnabled
                      ? `${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                  title="Click to toggle status"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isContributionsEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {isContributionsEnabled ? 'Active' : 'Disabled'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                {isContributionsEnabled
                  ? 'Free-will support active on app'
                  : 'Contributions disabled'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isContributionsEnabled}
            onClick={handleToggle}
            disabled={isToggling}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#088839]/20 disabled:opacity-50 ${
              isContributionsEnabled ? c.primaryBg : 'bg-slate-200'
            }`}
          >
            <span className="sr-only">Toggle Donations Gateway</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isContributionsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Card B: Paddle Payment Gateway Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center border shadow-xs ${
                enablePaddle
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Paddle Gateway
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    paddleMode === 'live'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {paddleMode === 'live' ? 'Live' : 'Sandbox'}
                </span>
                {enablePaddle && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Online
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                {paddleApiKey
                  ? `API Key: ${paddleApiKey.slice(0, 10)}...`
                  : 'Paddle API key not configured'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfigTab('PADDLE');
              setIsConfigModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paddle</span>
          </button>
        </div>

        {/* Card C: Preset Tiers & Humanitarian Commitment Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center border shadow-xs ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Tiers &amp; Solidarity
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {presets.slice(0, 3).map((p) => `€${p}`).join(', ')}...
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                Presets (€1-€15) &amp; charity commitment
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfigTab('TIERS');
              setIsConfigModalOpen(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shrink-0 ${c.primaryBg} ${c.primaryBgHover}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tiers</span>
          </button>
        </div>
      </div>

      {/* 2. Humanitarian Commitment Banner (Design Pattern Compliant) */}
      {enableHumanitarian && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
            >
              <HandHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {humanitarianTitle}
                </h3>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`}>
                  {humanitarianCharityShare}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {humanitarianBadge}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl font-medium leading-relaxed">
                {humanitarianText}
              </p>
              {humanitarianOrg && (
                <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className={`w-3.5 h-3.5 ${c.primaryText}`} />
                  <span>Redistribution Partner: <strong className="text-slate-800">{humanitarianOrg}</strong></span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfigTab('HUMANITARIAN');
              setIsConfigModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors whitespace-nowrap self-start md:self-center cursor-pointer shadow-2xs"
          >
            Edit Commitment
          </button>
        </div>
      )}

      {/* 3. 4-Column Key Metrics Grid (Consistent with Admin KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Total Raised
            </span>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              €{totalFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">From community donations</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Contributions
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              {totalCount}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Audited contribution records</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Average Donation
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              €{avgDonation}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Per supporter contribution</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Patron Backers
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              {patronCount}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Donations contributing &gt; €5</p>
          </div>
        </div>
      </div>

      {/* 4. Sliding Scale Tiers Overview Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
            >
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Free-Will Contribution Tiers (&ldquo;Prix libre&rdquo;)
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="font-semibold text-slate-700">App Presets:</span>
            {presets.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs"
              >
                €{p}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-600" /> Coffee Tier
              </span>
              <span className="font-mono">&le; {coffeeMax}€</span>
            </div>
            <p className="text-slate-500 mt-1 text-[11px] font-medium">Developer coffee &amp; quick code reviews.</p>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-600" /> Server Tier
              </span>
              <span className="font-mono">{coffeeMax + 1}€ – {serverMax}€</span>
            </div>
            <p className="text-slate-500 mt-1 text-[11px] font-medium">Server hosting &amp; AI vision token costs.</p>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between font-bold text-purple-900">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Project Growth
              </span>
              <span className="font-mono">{serverMax + 1}€ – {growthMax}€</span>
            </div>
            <p className="text-slate-500 mt-1 text-[11px] font-medium">Additive research &amp; barcode coverage.</p>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between font-bold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Crown className={`w-3.5 h-3.5 ${c.primaryText}`} /> Community Patron
              </span>
              <span className="font-mono">&gt; {growthMax}€</span>
            </div>
            <p className="text-slate-500 mt-1 text-[11px] font-medium">Continuous free access for the entire Ummah.</p>
          </div>
        </div>
      </div>

      {/* 5. Contributions History Table (Clean Project Pattern without Status and Receipt) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Header & Controls matching UserManagement & ProductCatalog pattern */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
            >
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Contributions History
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {contributions.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Audited record of community support contributions and transaction logs
              </p>
            </div>
          </div>

          {/* Action Buttons: Refresh from Server & Export CSV */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isRefreshingServer}
              onClick={handleRefreshServer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Load the latest real contributions directly from the server database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshingServer ? 'animate-spin' : ''}`} />
              <span>{isRefreshingServer ? 'Loading...' : 'Refresh from Server'}</span>
            </button>

            <button
              type="button"
              onClick={exportToCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Download contribution history records as CSV"
            >
              <Download className={`w-3.5 h-3.5 ${c.primaryText}`} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter & Search Bar */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search donor, email, location, or transaction ID..."
              className="w-full pl-8 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#088839]/20 focus:border-[#088839] transition-all font-medium placeholder:text-slate-400"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-[#088839]/20 focus:border-[#088839]"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="7D">Past 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="30D">Past 30 Days</option>
            </select>

            {/* Gateway Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-[#088839]/20 focus:border-[#088839]"
            >
              <option value="ALL">All Gateways</option>
              <option value="PADDLE">Paddle</option>
              <option value="STRIPE">Stripe (Legacy)</option>
              <option value="PAYPAL">PayPal</option>
              <option value="APPLE_PAY">Apple Pay</option>
              <option value="GOOGLE_PAY">Google Pay</option>
              <option value="MANUAL">Manual</option>
            </select>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-[#088839]/20 focus:border-[#088839]"
            >
              <option value="ALL">All Tiers</option>
              <option value="COFFEE">Coffee (&le; {coffeeMax}€)</option>
              <option value="SERVER">Server ({coffeeMax + 1}€–{serverMax}€)</option>
              <option value="GROWTH">Growth ({serverMax + 1}€–{growthMax}€)</option>
              <option value="PATRON">Patron (&gt; {growthMax}€)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-[#088839]/20 focus:border-[#088839]"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>

            {/* Sync Paddle Live Button */}
            <button
              type="button"
              disabled={isSyncingPaddle}
              onClick={handleSyncPaddle}
              title="Synchronize live transactions directly from Paddle API"
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingPaddle ? 'animate-spin' : ''}`} />
              <span>{isSyncingPaddle ? 'Syncing...' : 'Sync Paddle'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-2.5 px-4">Transaction Ref</th>
                <th className="py-2.5 px-4">Donor</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Tier &amp; Purpose</th>
                <th className="py-2.5 px-4">Gateway</th>
                <th className="py-2.5 px-4">Date &amp; Time</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDonations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2 border border-slate-200">
                        <HeartHandshake className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No Contributions Recorded Yet</p>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-sm font-medium">
                        Real donation transactions saved to your server database will appear here automatically.
                      </p>
                      <button
                        type="button"
                        disabled={isRefreshingServer}
                        onClick={handleRefreshServer}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshingServer ? 'animate-spin' : ''}`} />
                        <span>{isRefreshingServer ? 'Loading...' : 'Refresh from Server'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDonations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Transaction Reference */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {item.transactionId ? (
                          <button
                            onClick={() => copyToClipboard(item.transactionId!, 'Transaction ID')}
                            className="font-mono text-xs text-slate-800 hover:text-[#088839] bg-slate-100 px-2 py-0.5 rounded inline-flex items-center gap-1.5 group border border-slate-200 cursor-pointer"
                            title="Click to copy Transaction ID"
                          >
                            <span className="truncate max-w-[130px] font-bold">{item.transactionId}</span>
                            <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
                            {item.id}
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">ID: {item.id}</div>
                      </div>
                    </td>

                    {/* Donor Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`}
                        >
                          {item.donorName
                            ? item.donorName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()
                            : 'AN'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {item.donorName}
                            {item.isAnonymous && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Anon
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{item.donorEmail || 'No email'}</span>
                          </div>
                          {item.donorLocation && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[140px]">{item.donorLocation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm font-mono">
                      {item.currency === 'EUR' ? '€' : item.currency}
                      {(Number(item.amount) || 0).toFixed(2)}
                    </td>

                    {/* Tier & Purpose */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {getTierBadge(item.tier)}
                        {enableHumanitarian && (
                          <div className="text-[10px] text-[#088839] font-semibold flex items-center gap-1">
                            <span>Charity:</span>
                            <span className="font-bold font-mono">
                              {item.currency === 'EUR' ? '€' : item.currency}
                              {((Number(item.amount) || 0) * 0.2).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Payment Gateway */}
                    <td className="py-3 px-4">{getPaymentMethodBadge(item.paymentMethod)}</td>

                    {/* Date & Time */}
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {new Date(item.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Contribution Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination (Standardized across Admin) */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
            <span>
              Showing <strong>{paginatedDonations.length}</strong> of <strong>{sortedDonations.length}</strong> records
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[#088839] font-bold font-mono">
              Total Filtered: €{ledgerTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-slate-500 text-xs font-medium mr-2">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Contribution Tiers & Humanitarian Commitment Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
                >
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Contributions &amp; Payment Gateway Configuration
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure Paddle API Credentials, presets (€1, €3, €5, €10, €15) &amp; humanitarian commitment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 pt-2 overflow-x-auto">
              <button
                onClick={() => setConfigTab('PADDLE')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  configTab === 'PADDLE'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Paddle Payment Gateway
              </button>
              <button
                onClick={() => setConfigTab('TIERS')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  configTab === 'TIERS'
                    ? `border-[#088839] ${c.primaryText}`
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Presets &amp; Tiers
              </button>
              <button
                onClick={() => setConfigTab('HUMANITARIAN')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  configTab === 'HUMANITARIAN'
                    ? `border-[#088839] ${c.primaryText}`
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HandHeart className="w-4 h-4" />
                Humanitarian Commitment
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
              {/* TAB 0: PADDLE PAYMENT GATEWAY CONFIGURATION */}
              {configTab === 'PADDLE' && (
                <div className="space-y-5">
                  {/* Paddle Master Switch & Environment */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                          Paddle Payment Processing
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          Accept debit/credit cards, Apple Pay, Google Pay, and localized payment methods via Paddle
                        </p>
                      </div>
                    </div>

                    {/* Environment Selector: Sandbox vs Live Production */}
                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block font-mono">
                          Gateway Environment
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Switch between Sandbox testing and Live production payments
                        </span>
                      </div>

                      <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setPaddleMode('sandbox')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            paddleMode === 'sandbox'
                              ? 'bg-amber-100 text-amber-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Sandbox Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaddleMode('live')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            paddleMode === 'live'
                              ? `${c.primaryBg} text-white shadow-xs`
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Live Mode (Production)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* API Credentials Configuration */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-600" />
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                          Paddle API Credentials ({paddleMode.toUpperCase()})
                        </label>
                      </div>
                      {paddleMode === 'sandbox' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaddleClientToken(DEFAULT_AUTH_SETTINGS.paddleClientToken || '');
                            setPaddleApiKey(DEFAULT_AUTH_SETTINGS.paddleApiKey || '');
                            toast.success('Loaded default sandbox keys. Click "Save Configuration" to persist.', 'Defaults Applied');
                          }}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Load Sandbox Defaults
                        </button>
                      )}
                    </div>

                    {/* Client-side Token (Publishable Token) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-mono">
                        Client-side Token (Publishable Token)
                      </label>
                      <input
                        type="text"
                        value={paddleClientToken}
                        onChange={(e) => setPaddleClientToken(e.target.value)}
                        placeholder={paddleMode === 'live' ? 'live_...' : 'test_...'}
                        className={`${inputCls} font-mono`}
                      />
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Safe for client applications and Paddle.js initialization in web/mobile checkouts.
                      </p>
                    </div>

                    {/* Secret API Key with Test Connection */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 font-mono">
                          Secret API Key
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          {showApiKey ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Reveal</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={paddleApiKey}
                          onChange={(e) => setPaddleApiKey(e.target.value)}
                          placeholder={paddleMode === 'live' ? 'pdl_live_...' : 'pdl_sdbx_...'}
                          className={`${inputCls} font-mono flex-1`}
                        />
                        <button
                          type="button"
                          disabled={isTestingPaddle || !paddleApiKey.trim()}
                          onClick={handleTestPaddleConnection}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                        >
                          {isTestingPaddle ? (
                            <span>Verifying...</span>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Test Connection</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Kept secure on the server. Used to create Paddle transactions and verify incoming payments.
                      </p>

                      {/* Test Connection Result Feedback */}
                      {paddleTestResult && (
                        <div
                          className={`mt-2.5 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                            paddleTestResult.success
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {paddleTestResult.success ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>{paddleTestResult.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: PRESETS & TIERS */}
              {configTab === 'TIERS' && (
                <div className="space-y-5">
                  {/* Preset Buttons Configuration */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block font-mono">
                          App Preset Contribution Buttons
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          Quick-select amounts in the mobile support dialog (Standard: €1, €3, €5, €10, €15).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetToDefaultPresets}
                        className={`text-xs font-bold ${c.primaryText} hover:underline cursor-pointer`}
                      >
                        Reset to €1, €3, €5, €10, €15
                      </button>
                    </div>

                    {/* Active Presets Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {presets.map((p) => (
                        <div
                          key={p}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-sm shadow-2xs font-mono"
                        >
                          <span>{currency === 'EUR' ? '€' : currency}{p}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePreset(p)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove this preset"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add New Preset Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          {currency === 'EUR' ? '€' : currency}
                        </span>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={newPresetInput}
                          onChange={(e) => setNewPresetInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddPreset();
                            }
                          }}
                          placeholder="Amount"
                          className="w-full pl-7 pr-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#088839]/20 focus:border-[#088839]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPreset}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white shadow-2xs cursor-pointer ${c.primaryBg} ${c.primaryBgHover}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Preset</span>
                      </button>
                    </div>
                  </div>

                  {/* Limits & Default Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Default Selected Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          {currency === 'EUR' ? '€' : currency}
                        </span>
                        <input
                          type="number"
                          value={defaultAmount}
                          onChange={(e) => setDefaultAmount(Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Slider Min Limit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          {currency === 'EUR' ? '€' : currency}
                        </span>
                        <input
                          type="number"
                          value={minAmount}
                          onChange={(e) => setMinAmount(Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Slider Max Limit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          {currency === 'EUR' ? '€' : currency}
                        </span>
                        <input
                          type="number"
                          value={maxAmount}
                          onChange={(e) => setMaxAmount(Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tier Ceilings Configuration */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block font-mono">
                      Sliding Scale Tier Ceilings
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Coffee Tier Max */}
                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-2">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          Coffee Ceiling
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                            &le; €
                          </span>
                          <input
                            type="number"
                            value={coffeeMax}
                            onChange={(e) => setCoffeeMax(Number(e.target.value))}
                            className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">&le; {coffeeMax}€</p>
                      </div>

                      {/* Server Tier Max */}
                      <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 mb-2">
                          <Server className="w-3.5 h-3.5 text-blue-600" />
                          Server Ceiling
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                            &le; €
                          </span>
                          <input
                            type="number"
                            value={serverMax}
                            onChange={(e) => setServerMax(Number(e.target.value))}
                            className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{coffeeMax + 1}€ – {serverMax}€</p>
                      </div>

                      {/* Growth Tier Max */}
                      <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 mb-2">
                          <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                          Growth Ceiling
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                            &le; €
                          </span>
                          <input
                            type="number"
                            value={growthMax}
                            onChange={(e) => setGrowthMax(Number(e.target.value))}
                            className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{serverMax + 1}€ – {growthMax}€ (Patron &gt; {growthMax}€)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HUMANITARIAN COMMITMENT */}
              {configTab === 'HUMANITARIAN' && (
                <div className="space-y-4">
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
                      >
                        <HandHeart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          Display Humanitarian Commitment Banner in Mobile App
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          Highlights the project&apos;s ethical purpose, community solidarity, and redistribution of contributions to charity.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableHumanitarian}
                      onClick={() => setEnableHumanitarian(!enableHumanitarian)}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        enableHumanitarian ? c.primaryBg : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          enableHumanitarian ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title & Badge */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Commitment Section Title
                      </label>
                      <input
                        type="text"
                        value={humanitarianTitle}
                        onChange={(e) => setHumanitarianTitle(e.target.value)}
                        placeholder="Humanitarian Commitment & Solidarity"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Solidarity Tag / Badge
                      </label>
                      <input
                        type="text"
                        value={humanitarianBadge}
                        onChange={(e) => setHumanitarianBadge(e.target.value)}
                        placeholder="Charity Redistribution Partner"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Charity Share & Partner Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Redistribution Percentage / Note
                      </label>
                      <input
                        type="text"
                        value={humanitarianCharityShare}
                        onChange={(e) => setHumanitarianCharityShare(e.target.value)}
                        placeholder="20% Redistributed to Charity"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Partner Charitable Organization / Program
                      </label>
                      <input
                        type="text"
                        value={humanitarianOrg}
                        onChange={(e) => setHumanitarianOrg(e.target.value)}
                        placeholder="Global Halal Emergency Food Relief"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Commitment Statement / Purpose Text */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Humanitarian Purpose &amp; Redistribution Statement
                    </label>
                    <textarea
                      rows={4}
                      value={humanitarianText}
                      onChange={(e) => setHumanitarianText(e.target.value)}
                      placeholder="Explain the humanitarian purpose, solidarity, and redistributing a portion of donations to charity..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#088839] focus:ring-2 focus:ring-[#088839]/10 focus:bg-white transition-all font-medium leading-relaxed"
                    />
                  </div>

                  {/* Learn More Link */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Transparency &amp; Learn More URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={humanitarianUrl}
                      onChange={(e) => setHumanitarianUrl(e.target.value)}
                      placeholder="https://allohalal.fr/humanitarian"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#088839] focus:ring-2 focus:ring-[#088839]/10 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={handleSaveConfiguration}
                className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-98 ${c.primaryBg} ${c.primaryBgHover}`}
              >
                {isSavingConfig ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Delete Contribution Record?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to permanently delete this donation record of{' '}
              <strong className="text-slate-900">€{(Number(deleteConfirmItem.amount) || 0).toFixed(2)}</strong> from{' '}
              <strong className="text-slate-900">{deleteConfirmItem.donorName}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
