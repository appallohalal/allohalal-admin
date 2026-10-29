import net from 'net';
import tls from 'tls';
import { supabase } from './supabase';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface WelcomeEmailParams {
  name: string;
  username: string;
  email: string;
  password?: string;
  country?: string;
  city?: string;
  originUrl?: string;
}

export function buildWelcomeEmailHtml(params: {
  name: string;
  username: string;
  email: string;
  country?: string;
  city?: string;
  logoUrl?: string;
}): string {
  const location = [params.city, params.country].filter(Boolean).join(', ') || 'Global';
  const joinedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const logoUrl = params.logoUrl || 'https://halallens-admin.vercel.app/logo.png';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Allo Halal</title>
</head>
<body style="margin:0;padding:0;background-color:#eef5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef5f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #d5e8dc;box-shadow:0 16px 40px rgba(8,136,57,0.10);">
          
          <!-- Top Brand Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#088839 0%,#055a25 100%);padding:40px 32px 36px;text-align:center;">
              <img src="${logoUrl}" alt="Allo Halal" width="68" height="68" style="display:block;margin:0 auto 16px;width:68px;height:68px;border-radius:18px;border:2px solid rgba(255,255,255,0.28);background-color:#088839;object-fit:cover;" />
              <div style="display:inline-block;background-color:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:5px 14px;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">&#10003; Registration Complete</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.3px;line-height:1.25;">
                Welcome to Allo Halal!
              </h1>
              <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;font-weight:500;line-height:1.5;">
                Your trusted AI-powered companion for verifying Halal products &amp; ingredients
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#0f172a;">
                Assalamu Alaikum <strong style="color:#088839;">${params.name}</strong>,
              </p>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#475569;">
                Thank you for joining the <strong>Allo Halal</strong> community! Your account is now active and ready to use across the mobile app. Here is a summary of your registered profile:
              </p>

              <!-- Account Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fbf9;border:1px solid #d5e8dc;border-radius:18px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td colspan="2" style="background-color:#e6f4eb;padding:12px 20px;border-bottom:1px solid #cce5d4;">
                    <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#066d2e;">
                      Account Profile Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:13px 20px 8px;font-size:13px;color:#64748b;">Full Name</td>
                  <td style="padding:13px 20px 8px;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${params.name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 20px;font-size:13px;color:#64748b;border-top:1px dashed #e2e8f0;">Username</td>
                  <td style="padding:8px 20px;font-size:13px;font-weight:700;color:#088839;text-align:right;border-top:1px dashed #e2e8f0;">@${params.username}</td>
                </tr>
                <tr>
                  <td style="padding:8px 20px;font-size:13px;color:#64748b;border-top:1px dashed #e2e8f0;">Email Address</td>
                  <td style="padding:8px 20px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-top:1px dashed #e2e8f0;">${params.email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 20px;font-size:13px;color:#64748b;border-top:1px dashed #e2e8f0;">Location</td>
                  <td style="padding:8px 20px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-top:1px dashed #e2e8f0;">${location}</td>
                </tr>
                <tr>
                  <td style="padding:8px 20px 14px;font-size:13px;color:#64748b;border-top:1px dashed #e2e8f0;">Joined On</td>
                  <td style="padding:8px 20px 14px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-top:1px dashed #e2e8f0;">${joinedDate}</td>
                </tr>
              </table>

              <!-- Key Features Section -->
              <p style="margin:0 0 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;">
                What You Can Do in Allo Halal
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:10px;">
                <tr>
                  <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;">
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:3px;">
                      &#128247; Instant Barcode &amp; Product Scanner
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5;">
                      Scan any food barcode to immediately check its verified Halal, Haram, or Mushbooh status.
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:10px;">
                <tr>
                  <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;">
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:3px;">
                      &#10024; AI Ingredient Label Analysis
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5;">
                      Take a photo of ingredient labels or paste text for instant AI-powered Halal compliance checks.
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;">
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:3px;">
                      &#127760; 14-Language E-Numbers Dictionary
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5;">
                      Understand food additives and E-Numbers with clear scholarly explanations in your native language.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fbf9;border-top:1px solid #e2e8f0;padding:22px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#088839;">
                Allo Halal — Smart Halal Scanner
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
                &copy; ${new Date().getFullYear()} Allo Halal. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Low-level native Node.js SMTP client supporting both Port 465 (Implicit TLS)
 * and Port 587/25/2525 (STARTTLS) with AUTH LOGIN.
 */
export async function sendSmtpEmail(
  config: SmtpConfig,
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const host = config.host.trim();
    const port = Number(config.port) || 587;
    const user = config.user.trim();
    const pass = config.pass;
    const fromEmail = (config.fromEmail || user).trim();
    const fromName = (config.fromName || 'Allo Halal').trim();

    if (!host || !user || !pass) {
      return resolve({ success: false, error: 'Incomplete SMTP configuration (host, user, or password missing).' });
    }

    let socket: net.Socket | tls.TLSSocket;
    let buffer = '';
    let finished = false;

    const done = (result: { success: boolean; error?: string }) => {
      if (finished) return;
      finished = true;
      try {
        socket?.destroy();
      } catch (_) {}
      resolve(result);
    };

    const timeout = setTimeout(() => {
      done({ success: false, error: 'SMTP connection timed out after 12 seconds.' });
    }, 12000);

    const waitForResponse = (sock: net.Socket | tls.TLSSocket): Promise<{ code: number; text: string }> => {
      return new Promise((res, rej) => {
        const onData = (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\r\n');
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (/^\d{3} /.test(line)) {
              const code = parseInt(line.substring(0, 3), 10);
              const fullText = lines.slice(0, i + 1).join('\r\n');
              buffer = lines.slice(i + 1).join('\r\n');
              sock.removeListener('data', onData);
              sock.removeListener('error', onErr);
              res({ code, text: fullText });
              return;
            }
          }
        };
        const onErr = (err: Error) => {
          sock.removeListener('data', onData);
          rej(err);
        };
        sock.on('data', onData);
        sock.once('error', onErr);
      });
    };

    const sendCmd = async (sock: net.Socket | tls.TLSSocket, cmd: string, expectedCodes: number[]) => {
      sock.write(cmd + '\r\n');
      const resp = await waitForResponse(sock);
      if (!expectedCodes.includes(resp.code)) {
        throw new Error(`SMTP error (${resp.code}): ${resp.text}`);
      }
      return resp;
    };

    const runSession = async (initialSocket: net.Socket | tls.TLSSocket, isTls: boolean) => {
      try {
        let activeSocket = initialSocket;
        const greeting = await waitForResponse(activeSocket);
        if (greeting.code !== 220) {
          throw new Error(`SMTP greeting failed: ${greeting.text}`);
        }

        await sendCmd(activeSocket, `EHLO allohalal.app`, [250]);

        if (!isTls) {
          await sendCmd(activeSocket, 'STARTTLS', [220]);
          activeSocket = await new Promise<tls.TLSSocket>((res, rej) => {
            const tlsSock = tls.connect(
              {
                socket: activeSocket as net.Socket,
                servername: host,
                rejectUnauthorized: false,
              },
              () => res(tlsSock)
            );
            tlsSock.once('error', rej);
          });
          socket = activeSocket;
          buffer = '';
          await sendCmd(activeSocket, `EHLO allohalal.app`, [250]);
        }

        await sendCmd(activeSocket, 'AUTH LOGIN', [334]);
        await sendCmd(activeSocket, Buffer.from(user, 'utf8').toString('base64'), [334]);
        await sendCmd(activeSocket, Buffer.from(pass, 'utf8').toString('base64'), [235]);

        await sendCmd(activeSocket, `MAIL FROM:<${fromEmail}>`, [250]);
        await sendCmd(activeSocket, `RCPT TO:<${toEmail}>`, [250, 251]);
        await sendCmd(activeSocket, 'DATA', [354]);

        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
        const encodedFromName = `=?UTF-8?B?${Buffer.from(fromName, 'utf8').toString('base64')}?=`;
        const base64Html = Buffer.from(htmlBody, 'utf8')
          .toString('base64')
          .replace(/(.{76})/g, '$1\r\n');

        const message = [
          `From: "${encodedFromName}" <${fromEmail}>`,
          `To: <${toEmail}>`,
          `Subject: ${encodedSubject}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: <${Date.now()}.${Math.random().toString(36).substring(2)}@allohalal.app>`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          `Content-Transfer-Encoding: base64`,
          ``,
          base64Html,
          `.`,
        ].join('\r\n');

        await sendCmd(activeSocket, message, [250]);
        try {
          await sendCmd(activeSocket, 'QUIT', [221]);
        } catch (_) {}

        clearTimeout(timeout);
        done({ success: true });
      } catch (err: any) {
        clearTimeout(timeout);
        done({ success: false, error: err.message || 'SMTP transmission failed' });
      }
    };

    try {
      if (port === 465) {
        socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false });
        socket.once('error', (err) => {
          clearTimeout(timeout);
          done({ success: false, error: err.message });
        });
        runSession(socket, true);
      } else {
        socket = net.createConnection({ host, port });
        socket.once('error', (err) => {
          clearTimeout(timeout);
          done({ success: false, error: err.message });
        });
        runSession(socket, false);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      done({ success: false, error: err.message || 'Could not connect to SMTP server' });
    }
  });
}

/**
 * Triggers registration welcome email via configured Gmail SMTP.
 */
export async function sendRegistrationWelcomeEmail(params: WelcomeEmailParams): Promise<{
  emailSent: boolean;
  channel: string;
  details?: string;
}> {
  const baseUrl =
    params.originUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://halallens-admin.vercel.app';

  let sendWelcomeEmail = true;
  let smtpConfig: SmtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    fromName: process.env.SMTP_FROM_NAME || 'Allo Halal',
  };

  try {
    const { data } = await supabase
      .from('auth_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (data) {
      sendWelcomeEmail = data.send_welcome_email !== false;
      if (data.smtp_host) smtpConfig.host = data.smtp_host;
      if (data.smtp_port) smtpConfig.port = Number(data.smtp_port);
      if (data.smtp_user) smtpConfig.user = data.smtp_user;
      if (data.smtp_pass) smtpConfig.pass = String(data.smtp_pass).replace(/\s+/g, '');
      smtpConfig.fromEmail = data.smtp_from_email || data.smtp_user || smtpConfig.fromEmail;
      if (data.smtp_from_name) smtpConfig.fromName = data.smtp_from_name;
    }
  } catch (err) {
    console.warn('Could not load auth_settings for email:', err);
  }

  if (!sendWelcomeEmail) {
    return { emailSent: false, channel: 'DISABLED', details: 'Welcome emails are disabled in settings.' };
  }

  const hasSmtpCredentials = Boolean(smtpConfig.host && smtpConfig.user && smtpConfig.pass);
  if (!hasSmtpCredentials) {
    return {
      emailSent: false,
      channel: 'SMTP_NOT_CONFIGURED',
      details: 'Gmail SMTP credentials (email and App Password) are not configured yet.',
    };
  }

  const html = buildWelcomeEmailHtml({
    name: params.name,
    username: params.username,
    email: params.email,
    country: params.country,
    city: params.city,
    logoUrl: `${baseUrl}/logo.png`,
  });

  const smtpResult = await sendSmtpEmail(
    smtpConfig,
    params.email,
    'Welcome to Allo Halal! Your Account is Ready',
    html
  );

  return {
    emailSent: smtpResult.success,
    channel: smtpResult.success ? 'GMAIL_SMTP' : 'NONE',
    details: smtpResult.error,
  };
}
