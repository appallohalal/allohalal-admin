import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { FIREBASE_CONFIG } from '@/lib/firebase-config';

function sanitizeTopic(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.~%]/g, '_');
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getFirebaseAccessToken(): Promise<{ accessToken: string; projectId: string }> {
  const sa = FIREBASE_CONFIG.serviceAccount;

  const clientEmail = sa.client_email;
  const privateKey = sa.private_key.replace(/\\n/g, '\n');
  const projectId = sa.project_id || FIREBASE_CONFIG.projectId;
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaims}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey);
  const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to obtain Firebase OAuth2 access token');
  }

  return { accessToken: data.access_token, projectId };
}

export async function GET() {
  try {
    // 1. Fetch global toggle state from DB
    const { data: settingsData } = await supabase
      .from('notification_settings')
      .select('is_enabled, updated_at, updated_by')
      .eq('id', 'global')
      .maybeSingle();

    const settings = {
      id: 'global',
      firebaseProjectId: FIREBASE_CONFIG.projectId,
      firebaseApiKey: FIREBASE_CONFIG.apiKey,
      firebaseAppId: FIREBASE_CONFIG.appId,
      firebaseMessagingSenderId: FIREBASE_CONFIG.messagingSenderId,
      isEnabled: settingsData?.is_enabled ?? true,
      updatedAt: settingsData?.updated_at || new Date().toISOString(),
      updatedBy: settingsData?.updated_by || 'Admin',
    };

    // 2. Fetch history
    const { data: historyData } = await supabase
      .from('push_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    const history = (historyData || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      targetAudience: row.target_audience || 'ALL',
      deliveryStatus: row.delivery_status || 'SENT',
      recipientsCount: row.recipients_count || 0,
      fcmMessageId: row.onesignal_id,
      sentBy: row.sent_by || 'Admin',
      sentAt: row.sent_at,
      metadata: row.metadata || {},
    }));

    return NextResponse.json({
      success: true,
      settings,
      history,
    });
  } catch (error: any) {
    console.error('Error in GET /api/v1/notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'send';

    // ACTION: Global On/Off toggle
    if (action === 'toggle') {
      const { error } = await supabase
        .from('notification_settings')
        .upsert(
          {
            id: 'global',
            is_enabled: Boolean(body.isEnabled),
            updated_at: new Date().toISOString(),
            updated_by: body.updatedBy || 'Admin',
          },
          { onConflict: 'id' }
        );
      if (error) throw error;
      return NextResponse.json({ success: true, isEnabled: Boolean(body.isEnabled) });
    }

    // ACTION: Send Push Notification via Firebase Cloud Messaging
    if (action === 'send') {
      const { title, message, country = '', city = '', url = '', sentBy = 'Admin' } = body;
      const targetAudience = country ? (city ? `${country}, ${city}` : country) : 'ALL';
      const metadata: Record<string, any> = url ? { url } : {};

      if (!title || !message) {
        return NextResponse.json(
          { success: false, error: 'Title and Message are required' },
          { status: 400 }
        );
      }

      // Check global toggle
      const { data: dbSettings } = await supabase
        .from('notification_settings')
        .select('is_enabled')
        .eq('id', 'global')
        .maybeSingle();

      if (dbSettings && dbSettings.is_enabled === false) {
        return NextResponse.json(
          { success: false, error: 'Push notifications are turned OFF. Enable them first.' },
          { status: 403 }
        );
      }

      let deliveryStatus = 'SENT';
      let fcmMessageId = '';
      let rawResponse: any = null;

      const dataPayload: Record<string, string> = {
        source: 'allohalal_admin',
        timestamp: new Date().toISOString(),
      };
      if (url) dataPayload.url = String(url);

      try {
        const { accessToken, projectId } = await getFirebaseAccessToken();

        const fcmMessage: Record<string, any> = {
          notification: {
            title,
            body: message,
          },
          data: {
            ...dataPayload,
            title,
            body: message,
          },
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'allohalal_high_importance_channel',
              sound: 'default',
              default_vibrate_timings: true,
              default_sound: true,
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                alert: {
                  title,
                  body: message,
                },
                sound: 'default',
                'content-available': 1,
              },
            },
          },
        };

        if (country && city) {
          const cTopic = `country_${sanitizeTopic(country)}`;
          const ciTopic = `city_${sanitizeTopic(city)}`;
          fcmMessage.condition = `'${cTopic}' in topics && '${ciTopic}' in topics`;
        } else if (country) {
          fcmMessage.topic = `country_${sanitizeTopic(country)}`;
        } else {
          fcmMessage.topic = 'all';
        }

        const fcmRes = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ message: fcmMessage }),
          }
        );

        rawResponse = await fcmRes.json();
        if (fcmRes.ok && rawResponse.name) {
          fcmMessageId = rawResponse.name;
        } else {
          deliveryStatus = 'FAILED';
          console.error('FCM v1 Error Response:', rawResponse);
        }
      } catch (fcmErr: any) {
        deliveryStatus = 'FAILED';
        console.error('FCM Send Exception:', fcmErr);
        rawResponse = { error: fcmErr.message };
      }

      // Log to database
      const { data: insertedLog, error: logError } = await supabase
        .from('push_notifications')
        .insert({
          title,
          message,
          target_audience: targetAudience,
          delivery_status: deliveryStatus,
          recipients_count: 0,
          onesignal_id: fcmMessageId,
          sent_by: sentBy,
          metadata: {
            ...metadata,
            fcm_response: rawResponse,
          },
        })
        .select()
        .single();

      if (logError) {
        console.warn('Failed to insert push log into db:', logError);
      }

      if (deliveryStatus === 'FAILED') {
        return NextResponse.json(
          {
            success: false,
            error:
              rawResponse?.error?.message ||
              rawResponse?.error ||
              'Failed to send notification via Firebase Cloud Messaging',
            details: rawResponse,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification sent via Firebase FCM!',
        notification: insertedLog
          ? {
              id: insertedLog.id,
              title: insertedLog.title,
              message: insertedLog.message,
              targetAudience: insertedLog.target_audience,
              deliveryStatus: insertedLog.delivery_status,
              recipientsCount: insertedLog.recipients_count || 0,
              fcmMessageId: insertedLog.onesignal_id,
              sentBy: insertedLog.sent_by,
              sentAt: insertedLog.sent_at,
            }
          : {
              id: fcmMessageId,
              title,
              message,
              targetAudience,
              deliveryStatus,
              recipientsCount: 0,
              sentBy,
              sentAt: new Date().toISOString(),
            },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/v1/notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
