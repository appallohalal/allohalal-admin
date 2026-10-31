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
  const encodedSignature = base64UrlEncode(signature);

  const jwt = `${unsignedToken}.${encodedSignature}`;

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

// Resilient DB fetch for notification settings
async function getNotificationSettingsFromDb() {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (_) {}

  // Fallback to cms_settings
  try {
    const { data: cmsData } = await supabase
      .from('cms_settings')
      .select('texts')
      .eq('id', 'global')
      .maybeSingle();

    if (cmsData?.texts?._fcm_settings) {
      return cmsData.texts._fcm_settings;
    }
  } catch (_) {}

  return null;
}

// Resilient DB save for notification settings
async function saveNotificationSettingsToDb(
  payload: any,
  isEnabled?: boolean,
  updatedBy: string = 'Admin'
) {
  let saved = false;

  // 1. Save directly to notification_settings table
  try {
    const updateObj: Record<string, any> = {
      id: 'global',
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    };
    if (isEnabled !== undefined) updateObj.is_enabled = Boolean(isEnabled);
    if (payload) {
      if (payload.firebaseProjectId) updateObj.firebase_project_id = payload.firebaseProjectId;
      if (payload.firebaseApiKey) updateObj.firebase_api_key = payload.firebaseApiKey;
      if (payload.firebaseAppId) updateObj.firebase_app_id = payload.firebaseAppId;
      if (payload.firebaseMessagingSenderId) updateObj.firebase_messaging_sender_id = payload.firebaseMessagingSenderId;
      if (payload.firebaseServiceAccountJson) updateObj.firebase_service_account_json = payload.firebaseServiceAccountJson;
      if (payload.firebaseServerKey) updateObj.firebase_server_key = payload.firebaseServerKey;
    }

    const { error } = await supabase
      .from('notification_settings')
      .upsert(updateObj, { onConflict: 'id' });

    if (!error) saved = true;
  } catch (_) {}

  // 2. Mirror to cms_settings as resilient backup
  try {
    const { data: cmsData } = await supabase
      .from('cms_settings')
      .select('texts')
      .eq('id', 'global')
      .maybeSingle();

    const texts = cmsData?.texts || {};
    const existingFcm = texts._fcm_settings || {};
    texts._fcm_settings = {
      ...existingFcm,
      ...(payload || {}),
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : (existingFcm.isEnabled ?? true),
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    await supabase
      .from('cms_settings')
      .upsert(
        { id: 'global', texts, updated_at: new Date().toISOString(), updated_by: updatedBy },
        { onConflict: 'id' }
      );
    saved = true;
  } catch (_) {}

  return saved;
}

export async function GET() {
  try {
    const dbSettings = await getNotificationSettingsFromDb();

    let isEnabled = true;
    if (dbSettings) {
      if (typeof dbSettings.is_enabled === 'boolean') isEnabled = dbSettings.is_enabled;
      else if (typeof dbSettings.isEnabled === 'boolean') isEnabled = dbSettings.isEnabled;
    }

    const settings = {
      id: 'global',
      firebaseProjectId:
        dbSettings?.firebase_project_id ||
        dbSettings?.firebaseProjectId ||
        FIREBASE_CONFIG.projectId,
      firebaseApiKey:
        dbSettings?.firebase_api_key ||
        dbSettings?.firebaseApiKey ||
        FIREBASE_CONFIG.apiKey,
      firebaseAppId:
        dbSettings?.firebase_app_id ||
        dbSettings?.firebaseAppId ||
        FIREBASE_CONFIG.appId,
      firebaseMessagingSenderId:
        dbSettings?.firebase_messaging_sender_id ||
        dbSettings?.firebaseMessagingSenderId ||
        FIREBASE_CONFIG.messagingSenderId,
      firebaseServiceAccountJson:
        dbSettings?.firebase_service_account_json ||
        dbSettings?.firebaseServiceAccountJson ||
        '',
      firebaseServerKey:
        dbSettings?.firebase_server_key ||
        dbSettings?.firebaseServerKey ||
        '',
      isEnabled,
      updatedAt: dbSettings?.updated_at || dbSettings?.updatedAt || new Date().toISOString(),
      updatedBy: dbSettings?.updated_by || dbSettings?.updatedBy || 'Admin',
    };

    // Fetch history
    let history: any[] = [];
    try {
      const { data: historyData, error: histErr } = await supabase
        .from('push_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (!histErr && historyData) {
        history = historyData.map((row: any) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          targetAudience: row.target_audience || 'ALL',
          deliveryStatus: row.delivery_status || 'SENT',
          recipientsCount: row.recipients_count || 0,
          fcmMessageId: row.fcm_message_id || '',
          sentBy: row.sent_by || 'Admin',
          sentAt: row.sent_at,
          metadata: row.metadata || {},
        }));
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      settings,
      history,
    });
  } catch (error: any) {
    console.error('Error in GET /api/v1/notifications:', error);
    return NextResponse.json({
      success: true,
      settings: {
        id: 'global',
        firebaseProjectId: FIREBASE_CONFIG.projectId,
        firebaseApiKey: FIREBASE_CONFIG.apiKey,
        firebaseAppId: FIREBASE_CONFIG.appId,
        firebaseMessagingSenderId: FIREBASE_CONFIG.messagingSenderId,
        isEnabled: true,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin',
      },
      history: [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'send';

    // ACTION: Global On/Off toggle
    if (action === 'toggle') {
      const isEnabled = Boolean(body.isEnabled);
      await saveNotificationSettingsToDb(null, isEnabled, body.updatedBy || 'Admin');
      return NextResponse.json({ success: true, isEnabled });
    }

    // ACTION: Save Settings
    if (action === 'save_settings') {
      const isEnabled = body.isEnabled !== undefined ? Boolean(body.isEnabled) : true;
      await saveNotificationSettingsToDb(body, isEnabled, body.updatedBy || 'Admin');

      const settings = {
        id: 'global',
        firebaseProjectId: body.firebaseProjectId || FIREBASE_CONFIG.projectId,
        firebaseApiKey: body.firebaseApiKey || FIREBASE_CONFIG.apiKey,
        firebaseAppId: body.firebaseAppId || FIREBASE_CONFIG.appId,
        firebaseMessagingSenderId: body.firebaseMessagingSenderId || FIREBASE_CONFIG.messagingSenderId,
        firebaseServiceAccountJson: body.firebaseServiceAccountJson || '',
        firebaseServerKey: body.firebaseServerKey || '',
        isEnabled,
        updatedAt: new Date().toISOString(),
        updatedBy: body.updatedBy || 'Admin',
      };

      return NextResponse.json({ success: true, settings });
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
      const dbSettings = await getNotificationSettingsFromDb();
      if (
        dbSettings &&
        (dbSettings.is_enabled === false || dbSettings.isEnabled === false)
      ) {
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

        let targetTopic = 'global_alerts';
        if (country) {
          const sCountry = sanitizeTopic(country);
          const sCity = city ? sanitizeTopic(city) : '';
          targetTopic = sCity ? `${sCountry}_${sCity}` : sCountry;
        }

        const fcmMessage = {
          topic: targetTopic,
          notification: {
            title,
            body: message,
          },
          data: dataPayload,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channel_id: 'allohalal_alerts',
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };

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
      let insertedLog: any = null;
      try {
        const { data: logData, error: logError } = await supabase
          .from('push_notifications')
          .insert({
            title,
            message,
            target_audience: targetAudience,
            delivery_status: deliveryStatus,
            recipients_count: 0,
            fcm_message_id: fcmMessageId,
            sent_by: sentBy,
            metadata: {
              ...metadata,
              fcm_response: rawResponse,
            },
          })
          .select()
          .single();

        if (logError) {
          console.warn('Database push log notice:', logError.message);
        } else {
          insertedLog = logData;
        }
      } catch (_) {}

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
        message: 'Notification sent via Firebase Cloud Messaging (FCM)!',
        notification: insertedLog
          ? {
              id: insertedLog.id,
              title: insertedLog.title,
              message: insertedLog.message,
              targetAudience: insertedLog.target_audience,
              deliveryStatus: insertedLog.delivery_status,
              recipientsCount: insertedLog.recipients_count || 0,
              fcmMessageId: insertedLog.fcm_message_id,
              sentBy: insertedLog.sent_by,
              sentAt: insertedLog.sent_at,
            }
          : {
              id: fcmMessageId || `local_${Date.now()}`,
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
