-- ==============================================================================
-- HalalLens - Supabase PostgreSQL Database Schema
-- Modules: Products & Overrides, E-Numbers 14 Languages, Users, Geo-Ads, API Logs
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Enumerations
DO $$ BEGIN
  CREATE TYPE halal_status AS ENUM ('HALAL', 'HARAM', 'MUSHBOOH', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE additive_source AS ENUM ('Animal', 'Plant', 'Synthetic', 'Microbial', 'Insect', 'Doubtful');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE additive_source ADD VALUE IF NOT EXISTS 'Insect';
EXCEPTION
  WHEN others THEN null;
END $$;

-- 3. Products Catalog & AI Moderation Overrides
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  image_url TEXT,
  ingredients_raw TEXT,
  detected_additives TEXT[] DEFAULT '{}',
  ai_status halal_status DEFAULT 'MUSHBOOH',
  manual_status halal_status,
  is_overridden BOOLEAN DEFAULT FALSE,
  moderator_note TEXT,
  verified_by VARCHAR(128),
  scans_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant barcode lookups by Flutter app
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(manual_status, ai_status);

-- 4. E-Numbers & Additives Dictionary (14 Languages Supported)
CREATE TABLE IF NOT EXISTS public.additives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'E120', 'E471'
  name_en VARCHAR(255) NOT NULL,
  status halal_status DEFAULT 'MUSHBOOH',
  source additive_source DEFAULT 'Doubtful',
  category VARCHAR(128),
  -- translations JSONB contains 14 languages: en, bn, ar, ur, tr, id, fr, de, es, it, pt, ru, hi, zh
  translations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_additives_code ON public.additives(code);
CREATE INDEX IF NOT EXISTS idx_additives_status ON public.additives(status);

-- 5. User Management & Scan Tracking
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  country VARCHAR(64) DEFAULT 'Unknown',
  is_premium BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  total_scans INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_device ON public.users(device_id);

-- 6. Geo-Targeted Ads & Partnerships (PostGIS)
CREATE TABLE IF NOT EXISTS public.geo_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  sponsor_name VARCHAR(255) NOT NULL,
  banner_image_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION DEFAULT 15.0,
  location_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  impression_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Geospatial geometry point for PostGIS
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED
);

CREATE INDEX IF NOT EXISTS idx_geo_ads_geom ON public.geo_ads USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_geo_ads_active ON public.geo_ads(is_active);

-- 7. Groq AI & Scan API Logs
CREATE TABLE IF NOT EXISTS public.groq_api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint VARCHAR(128) NOT NULL,
  model VARCHAR(64) NOT NULL,
  barcode VARCHAR(64),
  user_device_id VARCHAR(128),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  status_code INTEGER DEFAULT 200,
  status VARCHAR(32) DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groq_logs_time ON public.groq_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groq_logs_status ON public.groq_api_logs(status);

-- ==============================================================================
-- 8. PostGIS RPC Function for Flutter Mobile App
-- Given user GPS (lat, lng), return all active matching sponsored banners within radius
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_active_ads_for_location(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  limit_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  sponsor_name VARCHAR,
  banner_image_url TEXT,
  target_url TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    a.id,
    a.title,
    a.sponsor_name,
    a.banner_image_url,
    a.target_url,
    ROUND((ST_Distance(a.geom, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) / 1000)::numeric, 2)::double precision AS distance_km
  FROM public.geo_ads a
  WHERE 
    a.is_active = TRUE
    AND (a.end_date IS NULL OR a.end_date > NOW())
    AND ST_DWithin(a.geom, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, a.radius_km * 1000)
  ORDER BY distance_km ASC
  LIMIT limit_count;
$$;

-- 8.1. Setup Status RPC Function (Check if initial super user registration is required)
CREATE OR REPLACE FUNCTION public.get_auth_setup_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM auth.users;
  RETURN json_build_object(
    'is_first_user', (v_count = 0),
    'user_count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_setup_status() TO anon, authenticated, service_role;

-- ==============================================================================
-- 9. Row Level Security (RLS) Permissive Policies for Admin & Mobile API
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for products" ON public.products;
CREATE POLICY "Allow all for products" ON public.products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.additives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for additives" ON public.additives;
CREATE POLICY "Allow all for additives" ON public.additives FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for users" ON public.users;
CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.geo_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for geo_ads" ON public.geo_ads;
CREATE POLICY "Allow all for geo_ads" ON public.geo_ads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.groq_api_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for groq_api_logs" ON public.groq_api_logs;
CREATE POLICY "Allow all for groq_api_logs" ON public.groq_api_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 10. Initial Seed Data (Core Additives & Sample Verified Products)
-- ==============================================================================
INSERT INTO public.additives (code, name_en, status, source, category, translations)
VALUES
(
  'E120',
  'Carmine / Cochineal',
  'HARAM',
  'Insect',
  'Coloring Agent',
  '{
    "en": {"name": "Carmine / Cochineal", "description": "Red pigment extracted from female cochineal insects (Dactylopius coccus).", "halalReason": "Derived directly from crushed insects; impermissible per dominant Islamic jurisprudence standards."},
    "bn": {"name": "কারমাইন / কোচিনিল", "description": "স্ত্রী কোচিনিল পোকা থেকে সংগৃহীত লাল রঞ্জক পদার্থ।", "halalReason": "পোকা পিষে তৈরি করায় অধিকাংশ ফিকহ অনুযায়ী এটি হারাম।"},
    "ar": {"name": "كارمين / كوشينيل", "description": "صبغة حمراء مستخرجة من حشرة الدودة القرمزية.", "halalReason": "مستخرج من الحشرات المطحونة وهو محرم في جمهور المذاهب الفقهية."},
    "ur": {"name": "کارمائن / کوچینیل", "description": "سرخ روغن جو مادہ کیڑے سے کشید کیا جاتا ہے۔", "halalReason": "کیڑے سے حاصل ہونے کی بنا پر حرام قرار دیا گیا ہے۔"}
  }'::jsonb
),
(
  'E471',
  'Mono- and Diglycerides of Fatty Acids',
  'MUSHBOOH',
  'Doubtful',
  'Emulsifier',
  '{
    "en": {"name": "Mono- and Diglycerides", "description": "Synthetic fats produced from glycerol and natural fatty acids (plant or animal).", "halalReason": "Requires Halal certification verification to confirm 100% plant or Halal animal derivation."},
    "bn": {"name": "মনো ও ডাইগ্লিসারাইডস", "description": "উদ্ভিজ্জ তেল বা প্রাণিজ চর্বি থেকে উৎপাদিত ফ্যাট এসিড উপাদান।", "halalReason": "প্রাণিজ নাকি উদ্ভিজ্জ উৎস তা যাচাইযোগ্য না হলে ব্যবহার সন্দেহজনক (মুশবুহ)।"},
    "ar": {"name": "أحادي وثنائي الجليسريد", "description": "مركبات دهنية مصنعة من زيوت نباتية أو دهون حيوانية.", "halalReason": "مشتبه حتى يتم إثبات مصدره النباتي أو الحيواني الحلال بشهادة معتمدة."}
  }'::jsonb
),
(
  'E100',
  'Curcumin',
  'HALAL',
  'Plant',
  'Coloring Agent',
  '{
    "en": {"name": "Curcumin / Turmeric Yellow", "description": "Natural yellow pigment extracted from the rhizomes of Curcuma longa (turmeric).", "halalReason": "100% plant-based rhizome root extract, universally permissible across all madhabs."},
    "bn": {"name": "কারকিউমিন (হলুদ রঞ্জক)", "description": "প্রাকৃতিক হলুদ উদ্ভিদের মূল থেকে নিষ্কাশিত রঞ্জক পদার্থ।", "halalReason": "১০০% ভেষজ উদ্ভিজ্জ উৎস হওয়ায় এটি সম্পূর্ণ হালাল।"}
  }'::jsonb
),
(
  'E441',
  'Gelatin',
  'MUSHBOOH',
  'Animal',
  'Gelling Agent',
  '{
    "en": {"name": "Gelatin", "description": "Protein obtained by boiling skin, tendons, ligaments, and/or bones with water.", "halalReason": "Haram if derived from porcine (pork) sources; Halal only if derived from fish or Halal zabiha bovine animals."},
    "bn": {"name": "জেলটিন", "description": "প্রাণীর ত্বক ও হাড় সিদ্ধ করে তৈরি প্রাকৃতিক প্রোটিন।", "halalReason": "শূকরজাত হলে সম্পূর্ণ হারাম। তবে হালাল জবেহকৃত গরু বা মাছ থেকে হলে গ্রহণযোগ্য।"}
  }'::jsonb
),
(
  'E621',
  'Monosodium Glutamate (MSG)',
  'HALAL',
  'Plant',
  'Flavor Enhancer',
  '{
    "en": {"name": "Monosodium Glutamate", "description": "Sodium salt of glutamic acid produced by fermentation of plant starch or molasses.", "halalReason": "Produced through bacterial fermentation of sugar beet or corn starch; 100% plant based and Halal."},
    "bn": {"name": "টেস্টিং সল্ট (এমএসজি)", "description": "ভুট্টা বা আখের নির্যাস থেকে ফার্মেন্টেশনের মাধ্যমে তৈরি স্বাদবর্ধক।", "halalReason": "উদ্ভিজ্জ গ্লুকোজ থেকে উৎপাদিত হওয়ায় হালাল।"}
  }'::jsonb
),
(
  'E904',
  'Shellac',
  'MUSHBOOH',
  'Insect',
  'Glazing Agent',
  '{
    "en": {"name": "Shellac", "description": "Natural resin secreted by female lac bugs on trees in the forests of India and Thailand.", "halalReason": "Differences of opinion among scholars regarding insect secretions without body parts."},
    "bn": {"name": "গালা বা শেল্যাক", "description": "লাক্ষা কীট দ্বারা নিঃসৃত প্রাকৃতিক রেজিন বা মোম সদৃশ উপাদান।", "halalReason": "কীটের মলত্যাগ/নিঃসরণ সংক্রান্ত ফতোয়ায় মতভেদ রয়েছে, তাই মুশবুহ।"}
  }'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- Seed Sample Scanned Products
INSERT INTO public.products (barcode, name, brand, image_url, ingredients_raw, detected_additives, ai_status, manual_status, is_overridden, moderator_note, verified_by, scans_count)
VALUES
(
  '8901030383748',
  'Oreo Original Sandwich Cookies',
  'Mondelez International',
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&auto=format&fit=crop&q=80',
  'Sugar, unbleached enriched flour, palm oil, soybean oil, cocoa, high fructose corn syrup, baking soda, salt, soy lecithin (E322), vanillin.',
  ARRAY['E322'],
  'HALAL',
  'HALAL',
  TRUE,
  'Plant-based formula verified, certified Halal packaging in Southeast Asian markets.',
  'Mahmudul Hasan (Admin)',
  1420
),
(
  '7622210815124',
  'Haribo Goldbären Gummy Bears',
  'Haribo GmbH',
  'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=200&auto=format&fit=crop&q=80',
  'Glucose syrup, sugar, gelatin (E441), dextrose, citric acid, fruit concentrates, beeswax, carnauba wax.',
  ARRAY['E441', 'E901', 'E903'],
  'MUSHBOOH',
  'HARAM',
  TRUE,
  'Contains European porcine (pork) gelatin in non-Turkish production batches. Strictly avoid.',
  'Mahmudul Hasan (Admin)',
  3892
),
(
  '4008400404127',
  'Kinder Bueno Chocolate Wafer',
  'Ferrero',
  'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&auto=format&fit=crop&q=80',
  'Milk chocolate (sugar, cocoa butter, cocoa mass, skim milk powder), sugar, palm oil, wheat flour, hazelnuts, mono and diglycerides of fatty acids (E471), soy lecithin (E322), vanillin, salt.',
  ARRAY['E471', 'E322', 'E500'],
  'MUSHBOOH',
  'HALAL',
  TRUE,
  'Ferrero confirmed 100% plant-origin mono- and diglycerides (palm oil derived) for this SKU.',
  'Mahmudul Hasan (Admin)',
  2510
)
ON CONFLICT (barcode) DO NOTHING;

-- ==============================================================================
-- 11. Google AdMob Ads Remote Configuration Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admob_settings (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
  
  -- Master & Mode Switches
  ads_enabled BOOLEAN DEFAULT FALSE,
  test_mode BOOLEAN DEFAULT TRUE,
  
  -- Format Toggles
  banner_enabled BOOLEAN DEFAULT TRUE,
  interstitial_enabled BOOLEAN DEFAULT TRUE,
  app_open_enabled BOOLEAN DEFAULT TRUE,
  native_enabled BOOLEAN DEFAULT TRUE,
  rewarded_enabled BOOLEAN DEFAULT FALSE,
  
  -- Frequency & Capping
  interstitial_interval_scans INTEGER DEFAULT 3,
  app_open_cooldown_minutes INTEGER DEFAULT 15,
  banner_refresh_rate_seconds INTEGER DEFAULT 60,
  
  -- Production IDs: Android
  android_app_id VARCHAR(128) DEFAULT '',
  android_banner_id VARCHAR(128) DEFAULT '',
  android_interstitial_id VARCHAR(128) DEFAULT '',
  android_app_open_id VARCHAR(128) DEFAULT '',
  android_native_id VARCHAR(128) DEFAULT '',
  android_rewarded_id VARCHAR(128) DEFAULT '',

  -- Production IDs: iOS
  ios_app_id VARCHAR(128) DEFAULT '',
  ios_banner_id VARCHAR(128) DEFAULT '',
  ios_interstitial_id VARCHAR(128) DEFAULT '',
  ios_app_open_id VARCHAR(128) DEFAULT '',
  ios_native_id VARCHAR(128) DEFAULT '',
  ios_rewarded_id VARCHAR(128) DEFAULT '',

  -- Google Official Test IDs
  test_android_app_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544~3347511713',
  test_android_banner_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/6300978111',
  test_android_interstitial_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/1033173712',
  test_android_app_open_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/9257395921',
  test_android_native_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/2247696110',
  test_android_rewarded_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/5224354917',

  test_ios_app_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544~1458002511',
  test_ios_banner_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/2934735716',
  test_ios_interstitial_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/4411468910',
  test_ios_app_open_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/5575463023',
  test_ios_native_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/3986624511',
  test_ios_rewarded_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/1712485313',

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(128) DEFAULT 'Admin'
);

ALTER TABLE public.admob_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for admob_settings" ON public.admob_settings;
CREATE POLICY "Allow all for admob_settings" ON public.admob_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.admob_settings (id, ads_enabled, test_mode)
VALUES ('global', false, true)
ON CONFLICT (id) DO NOTHING;


