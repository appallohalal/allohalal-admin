import crypto from 'crypto';
import { FIREBASE_CONFIG } from './firebase-config';
import { getActiveEmailConfig, sendSmtpEmail } from './email';

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sanitizeTopic(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.~%]/g, '_');
}

async function getFcmAccessToken(): Promise<{ accessToken: string; projectId: string } | null> {
  try {
    const sa = FIREBASE_CONFIG.serviceAccount;
    if (!sa?.client_email || !sa?.private_key) return null;

    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64UrlEncode(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    );
    const unsigned = `${header}.${claims}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const sig = base64UrlEncode(signer.sign(sa.private_key.replace(/\\n/g, '\n')));

    const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${sig}`,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) return null;
    return { accessToken: data.access_token, projectId: sa.project_id || FIREBASE_CONFIG.projectId };
  } catch {
    return null;
  }
}

export async function notifyUnknownProductSubscribers(
  db: any,
  barcode: string,
  productName?: string | null
): Promise<{ notifiedCount: number }> {
  try {
    const subs = await db.query(
      `SELECT id, fcm_token, user_email, user_id
       FROM public.unknown_product_submissions
       WHERE barcode = $1 AND notify_when_ready = true AND notified_at IS NULL`,
      [barcode]
    );
    if (!subs.rowCount) return { notifiedCount: 0 };

    const displayName =
      productName && productName.trim().length > 0
        ? productName.trim()
        : `Produit (${barcode})`;

    // Send at most ONE push notification per subscriber:
    // Prefer direct device FCM token; only fall back to ONE user topic if token is absent or fails.
    const tokenFallbacks = new Map<string, string | null>();
    const fallbackTopics = new Set<string>();
    const seenUsers = new Set<string>();

    for (const r of subs.rows) {
      const userKey =
        (typeof r.user_id === 'string' && r.user_id.trim()) ||
        (typeof r.user_email === 'string' && r.user_email.trim().toLowerCase()) ||
        r.id;

      const singleTopic =
        typeof r.user_id === 'string' && r.user_id.trim().length > 0
          ? `user_${sanitizeTopic(r.user_id)}`
          : typeof r.user_email === 'string' && r.user_email.trim().length > 0
            ? `user_${sanitizeTopic(r.user_email)}`
            : null;

      const token =
        typeof r.fcm_token === 'string' && r.fcm_token.trim().length > 0
          ? r.fcm_token.trim()
          : null;

      if (token) {
        if (!tokenFallbacks.has(token)) {
          tokenFallbacks.set(token, singleTopic);
        }
        seenUsers.add(userKey);
      } else if (singleTopic && !seenUsers.has(userKey)) {
        seenUsers.add(userKey);
        fallbackTopics.add(singleTopic);
      }
    }

    const emails: string[] = Array.from(
      new Set(
        subs.rows
          .map((r: any) => r.user_email)
          .filter((e: any) => typeof e === 'string' && e.includes('@'))
      )
    );

    if (tokenFallbacks.size > 0 || fallbackTopics.size > 0) {
      const auth = await getFcmAccessToken();
      if (auth) {
        const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`;
        const sendPayload = async (target: { token?: string; topic?: string }): Promise<boolean> => {
          try {
            const res = await fetch(fcmEndpoint, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${auth.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  ...target,
                  notification: {
                    title: 'Fiche produit disponible !',
                    body: `${displayName} (${barcode}) a été ajouté au catalogue Allo Halal.`,
                  },
                  data: {
                    type: 'product_ready',
                    barcode,
                  },
                },
              }),
            });
            return res.ok;
          } catch {
            return false;
          }
        };

        const sentFallbackTopics = new Set<string>(fallbackTopics);
        await Promise.all(
          Array.from(tokenFallbacks.entries()).map(async ([token, fallbackTopic]) => {
            const ok = await sendPayload({ token });
            if (!ok && fallbackTopic && !sentFallbackTopics.has(fallbackTopic)) {
              sentFallbackTopics.add(fallbackTopic);
              await sendPayload({ topic: fallbackTopic });
            }
          })
        );

        if (fallbackTopics.size > 0) {
          await Promise.all(
            Array.from(fallbackTopics).map((topic) => sendPayload({ topic }))
          );
        }
      }
    }

    if (emails.length > 0) {
      try {
        const emailCfg = await getActiveEmailConfig();
        if (emailCfg?.smtpConfig?.host && emailCfg.smtpConfig.user && emailCfg.smtpConfig.pass) {
          const subject = `Allo Halal — Fiche produit disponible : ${displayName}`;
          const html = `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;">
              <h2 style="color:#088839;margin-top:0;">Fiche produit disponible !</h2>
              <p>Bonjour,</p>
              <p>Le produit <strong>${displayName}</strong> (code-barres <code>${barcode}</code>) que vous avez demandé est désormais disponible dans l'application <strong>Allo Halal</strong>.</p>
              <p style="color:#64748b;font-size:13px;">Vous pouvez le scanner à nouveau dans l'application pour consulter son statut et sa certification.</p>
              <p style="margin-top:20px;font-size:12px;color:#94a3b8;">L'équipe Allo Halal</p>
            </div>
          `;
          await Promise.all(
            emails.map((to) => sendSmtpEmail(emailCfg.smtpConfig, to, subject, html).catch(() => null))
          );
        }
      } catch (emailErr) {
        console.warn('Email notify error:', emailErr);
      }
    }

    await db.query(
      `UPDATE public.unknown_product_submissions
       SET notified_at = NOW()
       WHERE barcode = $1 AND notify_when_ready = true AND notified_at IS NULL`,
      [barcode]
    );

    return { notifiedCount: subs.rowCount };
  } catch (err) {
    console.warn('Notify unknown subscribers error:', err);
    return { notifiedCount: 0 };
  }
}
