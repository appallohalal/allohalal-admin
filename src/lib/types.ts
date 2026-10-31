export type HalalStatus = 'HALAL' | 'HARAM' | 'MUSHBOOH' | 'UNKNOWN';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  imageUrl?: string;
  ingredientsRaw: string;
  detectedAdditives: string[];
  aiStatus: HalalStatus;
  manualStatus?: HalalStatus;
  isOverridden: boolean;
  moderatorNote?: string;
  verifiedBy?: string;
  scansCount: number;
  lastScannedAt: string;
  createdAt: string;
}

export interface AdditiveTranslation {
  language: string; // 'en' | 'bn' | 'ar' | 'ur' | 'tr' | 'fr' | 'de' | 'es' | 'hi' | 'id' | 'it' | 'pt' | 'ru' | 'zh'
  name: string;
  description: string;
  halalReason: string;
}

export interface Additive {
  id: string;
  code: string; // e.g. "E120", "E471"
  nameEn: string;
  status: HalalStatus;
  source: 'Animal' | 'Plant' | 'Synthetic' | 'Microbial' | 'Doubtful';
  category: string; // e.g. "Colouring", "Emulsifier", "Preservative"
  translations: Record<string, {
    name?: string;
    description: string;
    halalReason: string;
  }>;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  deviceId?: string;
  email?: string;
  name?: string;
  username?: string;
  country: string;
  city?: string;
  isPremium: boolean;
  isBanned: boolean;
  banReason?: string;
  totalScans: number;
  lastActiveAt: string;
  createdAt: string;
}

export type DonationStatus = 'COMPLETED' | 'PENDING' | 'REFUNDED';
export type DonationTier = 'COFFEE' | 'SERVER' | 'GROWTH' | 'PATRON';

export interface Contribution {
  id: string;
  donorName: string;
  donorEmail: string;
  donorLocation?: string;
  amount: number;
  currency: string; // 'EUR' | 'USD' | 'GBP'
  tier: DonationTier;
  paymentMethod: 'PADDLE' | 'STRIPE' | 'PAYPAL' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'MANUAL';
  transactionId?: string;
  paddleTransactionId?: string;
  message?: string;
  status: DonationStatus;
  isAnonymous?: boolean;
  reviewedBy?: string;
  createdAt: string;
}

export interface GeoAd {
  id: string;
  title: string;
  sponsorName: string;
  category?: string; // 'butcher' | 'restaurant' | 'grocery' | 'bakery' | 'other'
  bannerImageUrl: string;
  targetUrl: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  locationName: string;
  isActive: boolean;
  impressionCount: number;
  clickCount: number;
  startDate: string;
  endDate?: string;
}

export interface PartnerCategory {
  id: string;
  name: string;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface GroqApiLog {
  id: string;
  timestamp: string;
  endpoint: string;
  model: string;
  barcode?: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  statusCode: number;
  status: 'SUCCESS' | 'RATE_LIMITED' | 'ERROR' | 'FALLBACK';
  errorMessage?: string;
  userDeviceId?: string;
}

export interface GroqSettings {
  id: string;
  apiKey: string;
  model: string;
  visionModel: string;
  isEnabled: boolean;
  temperature: number;
  maxTokens: number;
  updatedAt: string;
  updatedBy: string;
}

export interface AnalyticsSummary {
  totalScans: number;
  todayScans: number;
  totalUsers: number;
  premiumUsers: number;
  groqRequestsToday: number;
  groqSuccessRate: number;
  groqAvgLatencyMs: number;
  halalProductsCount: number;
  haramProductsCount: number;
  mushboohProductsCount: number;
}

export interface AdMobSettings {
  id: string;
  adsEnabled: boolean;
  testMode: boolean;
  
  // Format switches
  bannerEnabled: boolean;
  interstitialEnabled: boolean;
  appOpenEnabled: boolean;
  nativeEnabled: boolean;
  rewardedEnabled: boolean;
  
  // Frequency & Capping
  interstitialIntervalScans: number;
  appOpenCooldownMinutes: number;
  bannerRefreshRateSeconds: number;
  
  // Production IDs: Android
  androidAppId: string;
  androidBannerId: string;
  androidInterstitialId: string;
  androidAppOpenId: string;
  androidNativeId: string;
  androidRewardedId: string;

  // Production IDs: iOS
  iosAppId: string;
  iosBannerId: string;
  iosInterstitialId: string;
  iosAppOpenId: string;
  iosNativeId: string;
  iosRewardedId: string;

  // Test IDs: Android
  testAndroidAppId: string;
  testAndroidBannerId: string;
  testAndroidInterstitialId: string;
  testAndroidAppOpenId: string;
  testAndroidNativeId: string;
  testAndroidRewardedId: string;

  // Test IDs: iOS
  testIosAppId: string;
  testIosBannerId: string;
  testIosInterstitialId: string;
  testIosAppOpenId: string;
  testIosNativeId: string;
  testIosRewardedId: string;

  updatedAt: string;
  updatedBy: string;
}

export interface AuthSettings {
  id: string;
  forceUserAuth: boolean;
  allowGuestScan: boolean;
  enableContributions?: boolean;
  requireEmailVerification?: boolean;
  sendWelcomeEmail?: boolean;
  emailProvider?: 'SUPABASE' | 'SMTP' | 'BOTH';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  welcomeEmailSubject?: string;
  welcomeEmailTitle?: string;
  welcomeEmailSubtitle?: string;
  welcomeEmailBody?: string;
  confirmationEmailSubject?: string;
  confirmationEmailTitle?: string;
  confirmationEmailSubtitle?: string;
  confirmationEmailBody?: string;

  // Contribution Presets & Tiers Configuration
  contributionPresets?: number[]; // e.g. [1, 3, 5, 10, 15]
  defaultContributionAmount?: number; // e.g. 5
  minContributionAmount?: number; // e.g. 1
  maxContributionAmount?: number; // e.g. 50
  contributionCurrency?: string; // e.g. 'EUR'
  coffeeMaxAmount?: number; // e.g. 2
  serverMaxAmount?: number; // e.g. 4
  growthMaxAmount?: number; // e.g. 9

  // Humanitarian Commitment & Solidarity
  enableHumanitarianCommitment?: boolean;
  humanitarianTitle?: string;
  humanitarianBadge?: string;
  humanitarianCharityShare?: string;
  humanitarianText?: string;
  humanitarianOrganizationName?: string;
  humanitarianLearnMoreUrl?: string;

  // Payment Gateway Configuration (Paddle Billing)
  enablePaddle?: boolean;
  paddleMode?: 'sandbox' | 'live';
  paddleApiKey?: string;
  paddleClientToken?: string;
  paddleWebhookSecret?: string;
  paddleCurrency?: string;

  updatedAt: string;
  updatedBy: string;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  targetAudience: string;
  deliveryStatus: 'SENT' | 'FAILED' | 'PENDING';
  recipientsCount: number;
  fcmMessageId?: string;
  sentBy: string;
  sentAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  id: string;
  firebaseProjectId: string;
  firebaseApiKey: string;
  firebaseAppId: string;
  firebaseMessagingSenderId: string;
  firebaseServiceAccountJson: string;
  firebaseServerKey?: string;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface CmsTexts {
  // Brand & Home Hero
  appName: string;
  splashSubtitle: string;
  heroSubtitle: string;
  scanBarcodeBtn: string;
  analyzeTextBtn: string;
  manualEntryBtn: string;

  // Home Feature Cards
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;

  // Onboarding Slides
  onboarding1Title: string;
  onboarding1Desc: string;
  onboarding2Title: string;
  onboarding2Desc: string;
  onboarding3Title: string;
  onboarding3Desc: string;
  onboarding4Title: string;
  onboarding4Desc: string;

  // Auth & Analysis
  loginTitle: string;
  loginSubtitle: string;
  registerTitle: string;
  registerSubtitle: string;
  textScanTitle: string;
  textScanSubtitle: string;
  resultDisclaimer: string;

  // Info & Legal Pages (GDPR Compliance & Help)
  aboutTitle: string;
  aboutContent: string;
  helpTitle: string;
  helpContent: string;
  privacyTitle: string;
  privacyContent: string;
  termsTitle?: string;
  termsContent?: string;

  // Geo-Ads & Proximity Custom Message
  geoAdsNoticeText?: string;

  // Registration Email Customization (Welcome & Confirmation)
  welcomeEmailSubject?: string;
  welcomeEmailTitle?: string;
  welcomeEmailSubtitle?: string;
  welcomeEmailBody?: string;
  confirmationEmailSubject?: string;
  confirmationEmailTitle?: string;
  confirmationEmailSubtitle?: string;
  confirmationEmailBody?: string;
}

export interface CmsSettings {
  id: string;
  texts: CmsTexts;
  translations?: Record<string, Partial<CmsTexts>>;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminSecurityUser {
  id: string;
  email: string;
  name: string;
  role: 'Super Admin' | 'Chief Auditor' | 'Halal Auditor' | 'System Admin';
  roleCategory: 'Admin' | 'Moderator';
  avatarInitials: string;
  createdAt: string;
  lastSignInAt: string | null;
  is2FAEnabled: boolean;
  twoFactorStatus: 'active' | 'disabled' | 'pending_setup';
  twoFactorSetupAt: string | null;
  isLocked?: boolean;
}

export interface SecurityAuditLog {
  id: string;
  event_type: string;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  target_user_id?: string | null;
  target_user_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: Record<string, any>;
  created_at: string;
}



