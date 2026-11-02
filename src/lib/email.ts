import net from 'net';
import tls from 'tls';
import { supabase } from './supabase';
import {
  WelcomeEmailParams,
  ConfirmationEmailParams,
  replaceEmailPlaceholders,
  buildWelcomeEmailHtml,
  buildConfirmationEmailHtml,
} from './email-templates';

export * from './email-templates';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
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
 * Helper to retrieve active SMTP configuration and email template texts from auth_settings
 */
export async function getActiveEmailConfig(): Promise<{
  sendWelcomeEmail: boolean;
  smtpConfig: SmtpConfig;
  welcomeSubject: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeBody: string;
  confirmationSubject: string;
  confirmationTitle: string;
  confirmationSubtitle: string;
  confirmationBody: string;
}> {
  let sendWelcomeEmail = true;
  const smtpConfig: SmtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    fromName: process.env.SMTP_FROM_NAME || 'Allo Halal',
  };

  let welcomeSubject = 'Welcome to Allo Halal! Your Account is Ready';
  let welcomeTitle = 'Welcome to Allo Halal!';
  let welcomeSubtitle = 'Your trusted AI-powered companion for verifying Halal products & ingredients';
  let welcomeBody = '';

  let confirmationSubject = 'Confirm Your Allo Halal Account';
  let confirmationTitle = 'Verify Your Email Address';
  let confirmationSubtitle = 'Please verify your email address to secure and activate your account';
  let confirmationBody = '';

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

      if (data.welcome_email_subject) welcomeSubject = data.welcome_email_subject;
      if (data.welcome_email_title) welcomeTitle = data.welcome_email_title;
      if (data.welcome_email_subtitle) welcomeSubtitle = data.welcome_email_subtitle;
      if (data.welcome_email_body) welcomeBody = data.welcome_email_body;

      if (data.confirmation_email_subject) confirmationSubject = data.confirmation_email_subject;
      if (data.confirmation_email_title) confirmationTitle = data.confirmation_email_title;
      if (data.confirmation_email_subtitle) confirmationSubtitle = data.confirmation_email_subtitle;
      if (data.confirmation_email_body) confirmationBody = data.confirmation_email_body;
    }
  } catch (err) {
    console.warn('Could not load auth_settings for email:', err);
  }

  return {
    sendWelcomeEmail,
    smtpConfig,
    welcomeSubject,
    welcomeTitle,
    welcomeSubtitle,
    welcomeBody,
    confirmationSubject,
    confirmationTitle,
    confirmationSubtitle,
    confirmationBody,
  };
}

/**
 * Triggers registration welcome email via configured Gmail SMTP using custom admin templates.
 */
export async function sendRegistrationWelcomeEmail(params: WelcomeEmailParams): Promise<{
  emailSent: boolean;
  channel: string;
  details?: string;
}> {
  const baseUrl =
    params.originUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://allohalal-admin.vercel.app';

  const cfg = await getActiveEmailConfig();

  if (!cfg.sendWelcomeEmail) {
    return { emailSent: false, channel: 'DISABLED', details: 'Welcome emails are disabled in settings.' };
  }

  const hasSmtpCredentials = Boolean(cfg.smtpConfig.host && cfg.smtpConfig.user && cfg.smtpConfig.pass);
  if (!hasSmtpCredentials) {
    return {
      emailSent: false,
      channel: 'SMTP_NOT_CONFIGURED',
      details: 'Gmail SMTP credentials (email and App Password) are not configured yet.',
    };
  }

  const subject = params.customSubject || cfg.welcomeSubject;
  const title = params.customTitle || cfg.welcomeTitle;
  const subtitle = params.customSubtitle || cfg.welcomeSubtitle;
  const bodyText = params.customBody || cfg.welcomeBody;

  const html = buildWelcomeEmailHtml({
    name: params.name,
    username: params.username,
    email: params.email,
    country: params.country,
    city: params.city,
    logoUrl: `${baseUrl}/logo.png`,
    title,
    subtitle,
    bodyText,
  });

  const parsedSubject = replaceEmailPlaceholders(subject, {
    name: params.name,
    username: params.username,
    email: params.email,
    country: params.country,
    city: params.city,
  });

  const smtpResult = await sendSmtpEmail(
    cfg.smtpConfig,
    params.email,
    parsedSubject,
    html
  );

  return {
    emailSent: smtpResult.success,
    channel: smtpResult.success ? 'GMAIL_SMTP' : 'NONE',
    details: smtpResult.error,
  };
}

/**
 * Triggers registration confirmation / verification email via configured Gmail SMTP.
 */
export async function sendRegistrationConfirmationEmail(params: ConfirmationEmailParams): Promise<{
  emailSent: boolean;
  channel: string;
  details?: string;
}> {
  const baseUrl =
    params.originUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://allohalal-admin.vercel.app';

  const cfg = await getActiveEmailConfig();

  const hasSmtpCredentials = Boolean(cfg.smtpConfig.host && cfg.smtpConfig.user && cfg.smtpConfig.pass);
  if (!hasSmtpCredentials) {
    return {
      emailSent: false,
      channel: 'SMTP_NOT_CONFIGURED',
      details: 'Gmail SMTP credentials (email and App Password) are not configured yet.',
    };
  }

  const subject = params.customSubject || cfg.confirmationSubject;
  const title = params.customTitle || cfg.confirmationTitle;
  const subtitle = params.customSubtitle || cfg.confirmationSubtitle;
  const bodyText = params.customBody || cfg.confirmationBody;

  const html = buildConfirmationEmailHtml({
    name: params.name,
    username: params.username,
    email: params.email,
    country: params.country,
    city: params.city,
    confirmationCode: params.confirmationCode,
    confirmationLink: params.confirmationLink,
    logoUrl: `${baseUrl}/logo.png`,
    title,
    subtitle,
    bodyText,
  });

  const parsedSubject = replaceEmailPlaceholders(subject, {
    name: params.name,
    username: params.username,
    email: params.email,
    country: params.country,
    city: params.city,
    code: params.confirmationCode,
  });

  const smtpResult = await sendSmtpEmail(
    cfg.smtpConfig,
    params.email,
    parsedSubject,
    html
  );

  return {
    emailSent: smtpResult.success,
    channel: smtpResult.success ? 'GMAIL_SMTP' : 'NONE',
    details: smtpResult.error,
  };
}

/**
 * Send a test email for previewing customized Welcome or Confirmation templates.
 */
export async function sendTestEmail(params: {
  toEmail: string;
  templateType: 'welcome' | 'confirmation';
  subject?: string;
  title?: string;
  subtitle?: string;
  bodyText?: string;
  originUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl =
    params.originUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://allohalal-admin.vercel.app';

  const cfg = await getActiveEmailConfig();

  const hasSmtpCredentials = Boolean(cfg.smtpConfig.host && cfg.smtpConfig.user && cfg.smtpConfig.pass);
  if (!hasSmtpCredentials) {
    return {
      success: false,
      error: 'Gmail SMTP is not configured yet. Please configure your Gmail address and App Password first in the SMTP modal.',
    };
  }

  const isWelcome = params.templateType === 'welcome';
  const defaultSubject = isWelcome ? cfg.welcomeSubject : cfg.confirmationSubject;
  const defaultTitle = isWelcome ? cfg.welcomeTitle : cfg.confirmationTitle;
  const defaultSubtitle = isWelcome ? cfg.welcomeSubtitle : cfg.confirmationSubtitle;
  const defaultBody = isWelcome ? cfg.welcomeBody : cfg.confirmationBody;

  const rawSubject = (params.subject || defaultSubject).trim();
  const rawTitle = (params.title || defaultTitle).trim();
  const rawSubtitle = (params.subtitle || defaultSubtitle).trim();
  const rawBody = params.bodyText !== undefined ? params.bodyText : defaultBody;

  const sampleVars = {
    name: 'Admin Test User',
    username: 'admin.tester',
    email: params.toEmail,
    country: 'France',
    city: 'Paris',
    appName: 'Allo Halal',
    code: '729401',
    link: `${baseUrl}/verify?test=true`,
    year: String(new Date().getFullYear()),
  };

  const finalSubject = `[TEST] ${replaceEmailPlaceholders(rawSubject, sampleVars)}`;

  const html = isWelcome
    ? buildWelcomeEmailHtml({
        name: sampleVars.name,
        username: sampleVars.username,
        email: sampleVars.email,
        country: sampleVars.country,
        city: sampleVars.city,
        logoUrl: `${baseUrl}/logo.png`,
        title: rawTitle,
        subtitle: rawSubtitle,
        bodyText: rawBody,
      })
    : buildConfirmationEmailHtml({
        name: sampleVars.name,
        username: sampleVars.username,
        email: sampleVars.email,
        country: sampleVars.country,
        city: sampleVars.city,
        confirmationCode: sampleVars.code,
        confirmationLink: sampleVars.link,
        logoUrl: `${baseUrl}/logo.png`,
        title: rawTitle,
        subtitle: rawSubtitle,
        bodyText: rawBody,
      });

  const res = await sendSmtpEmail(cfg.smtpConfig, params.toEmail, finalSubject, html);
  return res;
}

/**
 * Sends a confirmation email to the donor and an alert to admin@allo-halal.com
 * when a contribution is successfully processed.
 */
export async function sendContributionEmails(params: {
  donorEmail?: string;
  donorName?: string;
  amount: number;
  currency?: string;
  tier?: string;
  transactionId?: string;
  paymentMethod?: string;
  message?: string;
  originUrl?: string;
}): Promise<{
  donorResult?: { success: boolean; error?: string };
  adminResult?: { success: boolean; error?: string };
}> {
  const cfg = await getActiveEmailConfig();
  const hasSmtp = Boolean(cfg.smtpConfig.host && cfg.smtpConfig.user && cfg.smtpConfig.pass);

  if (!hasSmtp) {
    console.warn('[sendContributionEmails] SMTP credentials not configured.');
    return {
      donorResult: { success: false, error: 'SMTP not configured' },
      adminResult: { success: false, error: 'SMTP not configured' },
    };
  }

  const baseUrl =
    params.originUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://allohalal-admin.vercel.app';

  const currency = (params.currency || 'EUR').toUpperCase();
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  const formattedAmount = `${Number(params.amount || 0).toFixed(2)} ${symbol}`;
  const donorName = (params.donorName || '').trim() || 'Généreux Donateur';
  const paymentMethod = (params.paymentMethod || 'STRIPE').toUpperCase();
  const tier = (params.tier || 'SERVER').toUpperCase();
  const txnId = params.transactionId || `tx_${Date.now()}`;
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let donorResult: { success: boolean; error?: string } | undefined;
  let adminResult: { success: boolean; error?: string } | undefined;

  // 1. Donor Confirmation Email
  if (params.donorEmail && params.donorEmail.trim().includes('@')) {
    const donorEmail = params.donorEmail.trim();
    const donorSubject = `BarakAllahu Fik pour votre don de ${formattedAmount} à Allo Halal 💚`;
    const donorHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Merci pour votre contribution</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #088839 0%, #059669 100%); padding: 36px 30px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 10px;">🤲</div>
              <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; color: #ffffff;">BarakAllahu Fik !</h1>
              <p style="margin: 0; font-size: 14px; color: #d1fae5; font-weight: 500;">Votre soutien donne vie à la communauté Allo Halal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; color: #334155;">
                Cher(e) <strong>${donorName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; color: #475569;">
                Nous confirmons la bonne réception de votre contribution libre. Grâce à votre générosité, nous pouvons continuer à proposer un service d'analyse Halal 100% indépendant, gratuit et sans abonnement obligatoire.
              </p>

              <!-- Receipt Box -->
              <table role="presentation" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">Montant de la contribution :</td>
                  <td align="right" style="padding: 6px 0; font-size: 17px; color: #088839; font-weight: 800;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #166534;">Mode de paiement :</td>
                  <td align="right" style="padding: 6px 0; font-size: 13px; color: #15803d; font-weight: 600;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #166534;">Palier de soutien :</td>
                  <td align="right" style="padding: 6px 0; font-size: 13px; color: #15803d; font-weight: 600;">${tier}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #166534;">Date :</td>
                  <td align="right" style="padding: 6px 0; font-size: 12px; color: #64748b; font-family: monospace;">${dateStr}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #166534;">Référence :</td>
                  <td align="right" style="padding: 6px 0; font-size: 11px; color: #64748b; font-family: monospace;">${txnId}</td>
                </tr>
              </table>

              <!-- Humanitarian Notice -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-left: 4px solid #088839; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 12px; color: #475569; line-height: 1.5;">
                    🌱 <strong>Engagement solidaire :</strong> Une part de chaque contribution est reversée à des œuvres caritatives vérifiées pour l'aide alimentaire d'urgence.
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
                Qu'Allah accepte votre don et bénisse vos actions.<br>
                L'équipe <strong>Allo Halal</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Allo Halal — Modèle à Prix Libre & Éthique.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
    donorResult = await sendSmtpEmail(cfg.smtpConfig, donorEmail, donorSubject, donorHtml);
  }

  // 2. Admin Alert Email (admin@allo-halal.com)
  const adminEmail = 'admin@allo-halal.com';
  const adminSubject = `🚨 [Nouveau Don] ${formattedAmount} reçu de ${donorName} (${paymentMethod})`;
  const adminHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Notification Nouveau Don</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 25px; margin: 0; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 26px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <span style="font-size: 26px; margin-right: 10px;">💰</span>
      <div>
        <h2 style="margin: 0; font-size: 18px; color: #088839;">Nouvelle Contribution Enregistrée !</h2>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Allo Halal Admin Alert System</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 18px 0; background: #f8fafc; border-radius: 10px; overflow: hidden;">
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Montant :</td>
        <td style="padding: 10px 14px; font-weight: 800; font-size: 16px; color: #088839;">${formattedAmount}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Passerelle :</td>
        <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">${paymentMethod}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Palier :</td>
        <td style="padding: 10px 14px; color: #1e293b;">${tier}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Donateur :</td>
        <td style="padding: 10px 14px; color: #1e293b;">${donorName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Email :</td>
        <td style="padding: 10px 14px; color: #2563eb;">${params.donorEmail || 'Non renseigné'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Transaction ID :</td>
        <td style="padding: 10px 14px; font-family: monospace; font-size: 11px; color: #64748b;">${txnId}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Date :</td>
        <td style="padding: 10px 14px; font-size: 12px; color: #64748b;">${dateStr}</td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 22px;">
      <a href="${baseUrl}" style="display: inline-block; background-color: #088839; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: bold; padding: 10px 22px; border-radius: 10px;">
        Accéder au panneau d'administration
      </a>
    </div>
  </div>
</body>
</html>
`;
  adminResult = await sendSmtpEmail(cfg.smtpConfig, adminEmail, adminSubject, adminHtml);

  return { donorResult, adminResult };
}
