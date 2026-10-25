import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  // Fetch active ads directly from Supabase
  const { data: ads, error } = await supabase
    .from('geo_ads')
    .select('*')
    .eq('is_active', true);

  const activeAds = ads || [];

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({
      success: true,
      count: activeAds.length,
      ads: activeAds,
    });
  }

  // Filter ads within radius using Haversine calculation
  const matchingAds = activeAds
    .map((ad: any) => {
      const distanceKm = calculateDistanceKm(lat, lng, ad.latitude, ad.longitude);
      return {
        id: ad.id,
        title: ad.title,
        sponsorName: ad.sponsor_name,
        bannerImageUrl: ad.banner_image_url,
        targetUrl: ad.target_url,
        latitude: ad.latitude,
        longitude: ad.longitude,
        radiusKm: ad.radius_km,
        distanceKm,
        isWithinRadius: distanceKm <= (ad.radius_km || 15.0),
      };
    })
    .filter((ad) => ad.isWithinRadius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({
    success: true,
    userLocation: { lat, lng },
    count: matchingAds.length,
    ads: matchingAds,
  });
}
