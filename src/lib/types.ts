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

export interface GeoAd {
  id: string;
  title: string;
  sponsorName: string;
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
  requireEmailVerification?: boolean;
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

