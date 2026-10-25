'use client';

import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SupabaseSettings: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const sampleEnv = `# Add to admin/.env.local:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-for-admin-writes
GROQ_API_KEY=gsk_your_groq_api_key_here
`;

  const sqlCode = `-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Products Catalog & AI Moderation
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  image_url TEXT,
  ingredients_raw TEXT,
  detected_additives TEXT[] DEFAULT '{}',
  ai_status VARCHAR(32) DEFAULT 'MUSHBOOH',
  manual_status VARCHAR(32),
  is_overridden BOOLEAN DEFAULT FALSE,
  moderator_note TEXT,
  verified_by VARCHAR(128),
  scans_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. E-Numbers 14 Languages Dictionary
CREATE TABLE IF NOT EXISTS public.additives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  status VARCHAR(32) DEFAULT 'MUSHBOOH',
  source VARCHAR(32) DEFAULT 'Doubtful',
  category VARCHAR(128),
  translations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Geo-Targeted Ads with PostGIS Spatial Matching
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
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED
);

-- 5. PostGIS RPC Function for Mobile Location Matching
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
LANGUAGE sql STABLE AS $$
  SELECT id, title, sponsor_name, banner_image_url, target_url,
    ROUND((ST_Distance(geom, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) / 1000)::numeric, 2)::double precision AS distance_km
  FROM public.geo_ads
  WHERE is_active = TRUE
    AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
  ORDER BY distance_km ASC LIMIT limit_count;
$$;`;

  const copyToClipboard = (text: string, type: 'sql' | 'env') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 p-6 rounded-2xl flex items-start justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">PostgreSQL & Supabase Integration</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl font-medium">
            This admin panel is built with native PostgreSQL architecture. All 5 modules (Products, 14-Lang E-Numbers, Users, Geo-Ads with PostGIS, and Groq Logs) are ready to sync with your Supabase cloud project.
          </p>
        </div>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
        >
          Open Supabase <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Step 1: Environment Variables */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center border border-emerald-200">
              1
            </span>
            <h4 className="text-sm font-bold text-slate-900">Configure Environment (.env.local)</h4>
          </div>
          <button
            onClick={() => copyToClipboard(sampleEnv, 'env')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
          >
            {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            {copiedEnv ? 'Copied' : 'Copy .env snippet'}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-800 font-semibold overflow-x-auto leading-relaxed">
          {sampleEnv}
        </pre>
      </div>

      {/* Step 2: Supabase SQL Migration */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center border border-emerald-200">
              2
            </span>
            <h4 className="text-sm font-bold text-slate-900">Execute SQL Migration in Supabase Editor</h4>
          </div>
          <button
            onClick={() => copyToClipboard(sqlCode, 'sql')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSql ? 'Copied Full SQL' : 'Copy Full SQL Script'}
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          This script enables the PostGIS extension, creates all required tables, and adds the <code className="text-emerald-700 font-mono font-bold">get_active_ads_for_location()</code> spatial function.
        </p>

        <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-800 font-medium max-h-64 overflow-y-auto leading-relaxed">
          {sqlCode}
        </pre>
      </div>
    </div>
  );
};
