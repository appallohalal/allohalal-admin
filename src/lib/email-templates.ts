export interface WelcomeEmailParams {
  name: string;
  username: string;
  email: string;
  password?: string;
  country?: string;
  city?: string;
  originUrl?: string;
  customSubject?: string;
  customTitle?: string;
  customSubtitle?: string;
  customBody?: string;
}

export interface ConfirmationEmailParams {
  name: string;
  username?: string;
  email: string;
  country?: string;
  city?: string;
  originUrl?: string;
  confirmationCode?: string;
  confirmationLink?: string;
  customSubject?: string;
  customTitle?: string;
  customSubtitle?: string;
  customBody?: string;
}

/**
 * Replaces dynamic placeholders in email templates
 */
export function replaceEmailPlaceholders(
  text: string,
  vars: {
    name?: string;
    username?: string;
    email?: string;
    country?: string;
    city?: string;
    appName?: string;
    code?: string;
    link?: string;
    year?: string;
  }
): string {
  if (!text) return '';
  return text
    .replace(/{name}/g, vars.name || 'Valued User')
    .replace(/{username}/g, vars.username || 'user')
    .replace(/{email}/g, vars.email || 'user@example.com')
    .replace(/{country}/g, vars.country || 'Global')
    .replace(/{city}/g, vars.city || 'Global')
    .replace(/{appName}/g, vars.appName || 'Allo Halal')
    .replace(/{app_name}/g, vars.appName || 'Allo Halal')
    .replace(/{code}/g, vars.code || '123456')
    .replace(/{verification_link}/g, vars.link || 'https://allohalal.app/verify')
    .replace(/{link}/g, vars.link || 'https://allohalal.app/verify')
    .replace(/{year}/g, vars.year || String(new Date().getFullYear()));
}

export function buildWelcomeEmailHtml(params: {
  name: string;
  username: string;
  email: string;
  country?: string;
  city?: string;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  bodyText?: string;
}): string {
  const location = [params.city, params.country].filter(Boolean).join(', ') || 'Global';
  const joinedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const logoUrl = params.logoUrl || 'https://allohalal-admin.vercel.app/logo.png';

  const templateVars = {
    name: params.name,
    username: params.username,
    email: params.email,
    country: params.country,
    city: params.city,
    appName: 'Allo Halal',
    year: String(new Date().getFullYear()),
  };

  const headerTitle = params.title
    ? replaceEmailPlaceholders(params.title, templateVars)
    : 'Welcome to Allo Halal!';

  const headerSubtitle = params.subtitle
    ? replaceEmailPlaceholders(params.subtitle, templateVars)
    : 'Your trusted AI-powered companion for verifying Halal products & ingredients';

  let renderedBodyHtml = '';
  if (params.bodyText && params.bodyText.trim()) {
    const parsedText = replaceEmailPlaceholders(params.bodyText.trim(), templateVars);
    const paragraphs = parsedText.split(/\n\s*\n/);
    renderedBodyHtml = paragraphs
      .map(
        (p) =>
          `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#334155;">${p
            .split('\n')
            .join('<br/>')}</p>`
      )
      .join('');
  } else {
    renderedBodyHtml = `
      <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#0f172a;">
        Assalamu Alaikum <strong style="color:#088839;">${params.name}</strong>,
      </p>
      <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#475569;">
        Thank you for joining the <strong>Allo Halal</strong> community! Your account is now active and ready to use across the mobile app. Here is a summary of your registered profile:
      </p>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle}</title>
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
                ${headerTitle}
              </h1>
              <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;font-weight:500;line-height:1.5;">
                ${headerSubtitle}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 32px 28px;">
              ${renderedBodyHtml}

              <!-- Account Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fbf9;border:1px solid #d5e8dc;border-radius:18px;overflow:hidden;margin-top:20px;margin-bottom:28px;">
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
 * Builds HTML template for account confirmation / email verification
 */
export function buildConfirmationEmailHtml(params: {
  name: string;
  username?: string;
  email: string;
  country?: string;
  city?: string;
  confirmationCode?: string;
  confirmationLink?: string;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  bodyText?: string;
}): string {
  const logoUrl = params.logoUrl || 'https://allohalal-admin.vercel.app/logo.png';
  const confirmationCode = params.confirmationCode || '849201';
  const confirmationLink =
    params.confirmationLink ||
    'https://allohalal-admin.vercel.app/verify?code=' + confirmationCode;

  const templateVars = {
    name: params.name,
    username: params.username || params.name,
    email: params.email,
    country: params.country,
    city: params.city,
    appName: 'Allo Halal',
    code: confirmationCode,
    link: confirmationLink,
    year: String(new Date().getFullYear()),
  };

  const headerTitle = params.title
    ? replaceEmailPlaceholders(params.title, templateVars)
    : 'Verify Your Email Address';

  const headerSubtitle = params.subtitle
    ? replaceEmailPlaceholders(params.subtitle, templateVars)
    : 'Please verify your email address to secure and activate your account';

  let renderedBodyHtml = '';
  if (params.bodyText && params.bodyText.trim()) {
    const parsedText = replaceEmailPlaceholders(params.bodyText.trim(), templateVars);
    const paragraphs = parsedText.split(/\n\s*\n/);
    renderedBodyHtml = paragraphs
      .map(
        (p) =>
          `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#334155;">${p
            .split('\n')
            .join('<br/>')}</p>`
      )
      .join('');
  } else {
    renderedBodyHtml = `
      <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#0f172a;">
        Assalamu Alaikum <strong style="color:#088839;">${params.name}</strong>,
      </p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#475569;">
        Thank you for creating an account with <strong>Allo Halal</strong>! To complete your registration and activate your account features, please verify your email address by using the button or confirmation code below:
      </p>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle}</title>
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
                <span style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">&#128274; Email Verification Required</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.3px;line-height:1.25;">
                ${headerTitle}
              </h1>
              <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;font-weight:500;line-height:1.5;">
                ${headerSubtitle}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 32px 28px;">
              ${renderedBodyHtml}

              <!-- Verification Callout Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#f0fdf4 0%,#e6f7ec 100%);border:2px dashed #86efac;border-radius:20px;margin:24px 0;text-align:center;">
                <tr>
                  <td style="padding:28px 24px;">
                    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#166534;margin-bottom:8px;">
                      Your One-Time Verification Code
                    </div>
                    <div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#088839;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;margin-bottom:20px;">
                      ${confirmationCode}
                    </div>
                    <div>
                      <a href="${confirmationLink}" target="_blank" style="display:inline-block;background-color:#088839;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:12px;box-shadow:0 4px 12px rgba(8,136,57,0.25);">
                        Confirm My Email Address &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Safety Notice -->
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;border-top:1px solid #f1f5f9;padding-top:18px;">
                <strong>Security Notice:</strong> If you did not create an account with Allo Halal, you can safely ignore this email. No changes will be made to your email address without this confirmation.
              </p>
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

