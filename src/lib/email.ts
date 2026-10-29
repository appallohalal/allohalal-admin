import net from 'net';
import tls from 'tls';
import crypto from 'crypto';
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

export function generateEmailVerificationToken(email: string): string {
  const secret = process.env.SUPABASE_JWT_SECRET || 'allohalal_email_verify_secret_v1';
  return crypto
    .createHmac('sha256', secret)
    .update(email.trim().toLowerCase())
    .digest('hex')
    .substring(0, 32);
}

export function buildWelcomeEmailHtml(params: {
  name: string;
  username: string;
  email: string;
  country?: string;
  city?: string;
  confirmUrl: string;
}): string {
  const location = [params.city, params.country].filter(Boolean).join(', ') || 'Global';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Allo Halal</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 25px rgba(8,136,57,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#088839 0%,#066d2e 100%);padding:32px 28px;text-align:center;">
              <div style="display:inline-block;background-color:rgba(255,255,255,0.15);border-radius:14px;padding:10px 18px;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">ALLO HALAL</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;line-height:1.3;">
                Welcome to Allo Halal!
              </h1>
              <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;font-weight:500;">
                Your AI-Powered Halal Product &amp; Ingredient Scanner
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Assalamu Alaikum <strong>${params.name}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
                Thank you for registering with <strong>Allo Halal</strong>! Your account has been created successfully. Please confirm your email address below to complete your registration.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:28px 0;">
                <a href="${params.confirmUrl}" style="display:inline-block;background-color:#088839;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(8,136,57,0.25);">
                  Confirm Email Address
                </a>
              </div>

              <!-- Account Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:24px;">
                <tr>
                  <td colspan="2" style="padding-bottom:10px;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#088839;">
                    Registered Account Summary
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:10px;font-size:13px;color:#64748b;">Full Name:</td>
                  <td style="padding-top:10px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${params.name}</td>
                </tr>
                <tr>
                  <td style="padding-top:6px;font-size:13px;color:#64748b;">Username:</td>
                  <td style="padding-top:6px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">@${params.username}</td>
                </tr>
                <tr>
                  <td style="padding-top:6px;font-size:13px;color:#64748b;">Email:</td>
                  <td style="padding-top:6px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${params.email}</td>
                </tr>
                <tr>
                  <td style="padding-top:6px;font-size:13px;color:#64748b;">Location:</td>
                  <td style="padding-top:6px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${location}</td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                With Allo Halal, you can scan barcodes, analyze ingredient labels using AI, and check E-Numbers in 14 languages anytime.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
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
          // Check if last complete line is a final SMTP response (3 digits followed by space)
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

        // Upgrade via STARTTLS if on port 587/25/2525
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

        // Authenticate via AUTH LOGIN
        await sendCmd(activeSocket, 'AUTH LOGIN', [334]);
        await sendCmd(activeSocket, Buffer.from(user, 'utf8').toString('base64'), [334]);
        await sendCmd(activeSocket, Buffer.from(pass, 'utf8').toString('base64'), [235]);

        // Envelope
        await sendCmd(activeSocket, `MAIL FROM:<${fromEmail}>`, [250]);
        await sendCmd(activeSocket, `RCPT TO:<${toEmail}>`, [250, 251]);
        await sendCmd(activeSocket, 'DATA', [354]);

        // Construct MIME message
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
 * Triggers registration welcome & confirmation email via Supabase Auth and/or configured SMTP.
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
  const token = generateEmailVerificationToken(params.email);
  const confirmUrl = `${baseUrl}/auth/confirm?email=${encodeURIComponent(params.email)}&token=${token}`;

  // 1. Load email settings from Supabase `auth_settings`
  let sendWelcomeEmail = true;
  let emailProvider: 'SUPABASE' | 'SMTP' | 'BOTH' = 'BOTH';
  let smtpConfig: SmtpConfig = {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
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
      emailProvider = (data.email_provider || 'BOTH').toUpperCase() as any;
      if (data.smtp_host) smtpConfig.host = data.smtp_host;
      if (data.smtp_port) smtpConfig.port = Number(data.smtp_port);
      if (data.smtp_user) smtpConfig.user = data.smtp_user;
      if (data.smtp_pass) smtpConfig.pass = data.smtp_pass;
      if (data.smtp_from_email) smtpConfig.fromEmail = data.smtp_from_email;
      if (data.smtp_from_name) smtpConfig.fromName = data.smtp_from_name;
    }
  } catch (err) {
    console.warn('Could not load auth_settings for email:', err);
  }

  if (!sendWelcomeEmail) {
    return { emailSent: false, channel: 'DISABLED', details: 'Welcome emails are disabled in settings.' };
  }

  const channelsUsed: string[] = [];
  const errors: string[] = [];

  // 2. Send via Custom SMTP if configured and enabled
  const hasSmtpCredentials = Boolean(smtpConfig.host && smtpConfig.user && smtpConfig.pass);
  if ((emailProvider === 'SMTP' || emailProvider === 'BOTH') && hasSmtpCredentials) {
    const html = buildWelcomeEmailHtml({
      name: params.name,
      username: params.username,
      email: params.email,
      country: params.country,
      city: params.city,
      confirmUrl,
    });

    const smtpResult = await sendSmtpEmail(
      smtpConfig,
      params.email,
      'Welcome to Allo Halal! Please Confirm Your Email',
      html
    );

    if (smtpResult.success) {
      channelsUsed.push('SMTP');
    } else if (smtpResult.error) {
      errors.push(`SMTP: ${smtpResult.error}`);
    }
  }

  // 3. Trigger Supabase Auth Confirmation Email (when provider is SUPABASE, BOTH, or as fallback if SMTP isn't configured)
  if (emailProvider === 'SUPABASE' || emailProvider === 'BOTH' || channelsUsed.length === 0) {
    try {
      const signUpPassword =
        params.password && params.password.length >= 6
          ? params.password
          : `AlloHalal#${crypto.randomBytes(6).toString('hex')}`;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: params.email.trim().toLowerCase(),
        password: signUpPassword,
        options: {
          emailRedirectTo: confirmUrl,
          data: {
            name: params.name,
            username: params.username,
            country: params.country || '',
            city: params.city || '',
            account_type: 'mobile_user',
          },
        },
      });

      if (!signUpError && signUpData?.user) {
        channelsUsed.push('SUPABASE_AUTH');
        // If identities is empty (user already existed in auth.users), trigger resend
        if (Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
          await supabase.auth.resend({
            type: 'signup',
            email: params.email.trim().toLowerCase(),
            options: { emailRedirectTo: confirmUrl },
          });
        }
      } else if (signUpError) {
        // If user already registered in Supabase Auth, resend confirmation email
        if (signUpError.message.toLowerCase().includes('already registered')) {
          const { error: resendErr } = await supabase.auth.resend({
            type: 'signup',
            email: params.email.trim().toLowerCase(),
            options: { emailRedirectTo: confirmUrl },
          });
          if (!resendErr) {
            channelsUsed.push('SUPABASE_AUTH_RESEND');
          } else {
            errors.push(`Supabase Resend: ${resendErr.message}`);
          }
        } else {
          errors.push(`Supabase Auth: ${signUpError.message}`);
        }
      }
    } catch (err: any) {
      errors.push(`Supabase Auth Exception: ${err.message || err}`);
    }
  }

  return {
    emailSent: channelsUsed.length > 0,
    channel: channelsUsed.join(' + ') || 'NONE',
    details: errors.length > 0 ? errors.join(' | ') : undefined,
  };
}
