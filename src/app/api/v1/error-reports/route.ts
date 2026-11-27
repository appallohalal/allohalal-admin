import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';
import { getActiveEmailConfig, sendSmtpEmail } from '@/lib/email';

const REPORT_TYPE_LABELS: Record<string, string> = {
  ingredients: 'Ingrédients',
  certifier: 'Certificateur / Logo Halal',
  status: 'Statut Halal',
  other: 'Autre',
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  try {
    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }
    const res = await db.query(
      `SELECT * FROM public.product_error_reports ORDER BY created_at DESC LIMIT 200`
    );
    return NextResponse.json({ success: true, reports: res.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error fetching reports.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barcode, productId, productName, reportType, message, userId, userEmail, deviceId } = body;

    if (!barcode || !message || !String(message).trim()) {
      return NextResponse.json(
        { success: false, error: 'Barcode and error description are required.' },
        { status: 400 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    const allowedTypes = new Set(['ingredients', 'certifier', 'status', 'other']);
    const cleanType = allowedTypes.has(reportType) ? reportType : 'other';

    const res = await db.query(
      `INSERT INTO public.product_error_reports (
         barcode, product_id, product_name, report_type, message,
         user_id, user_email, device_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'nouveau')
       RETURNING *`,
      [
        String(barcode).trim(),
        productId || null,
        productName || null,
        cleanType,
        String(message).trim(),
        userId || null,
        userEmail || null,
        deviceId || null,
      ]
    );

    const report = res.rows[0];

    // Send email alert to all active Admin / Auditor accounts via configured SMTP
    let emailSent = false;
    try {
      const emailCfg = await getActiveEmailConfig();
      if (emailCfg?.smtpConfig?.host && emailCfg.smtpConfig.user && emailCfg.smtpConfig.pass) {
        const adminsRes = await db.query(
          `SELECT DISTINCT LOWER(TRIM(email)) AS email
           FROM auth.users
           WHERE email IS NOT NULL AND TRIM(email) <> ''`
        );
        const recipients = Array.from(
          new Set<string>(
            adminsRes.rows
              .map((r: any) => String(r.email || '').trim().toLowerCase())
              .filter((e: string) => e.includes('@'))
          )
        );

        if (recipients.length > 0) {
          const cleanBarcode = String(barcode).trim();
          const cleanProductName = String(productName || 'Produit sans nom').trim();
          const typeLabel = REPORT_TYPE_LABELS[cleanType] || cleanType;
          const reporterLabel = userEmail ? String(userEmail).trim() : 'Utilisateur invité (non connecté)';
          const dateStr = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
          const adminOrigin =
            process.env.NEXT_PUBLIC_APP_URL || 'https://allohalal-admin.vercel.app';

          const subject = `🚩 [Signalement d'erreur] ${cleanProductName} (${cleanBarcode})`;
          const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;padding:24px;margin:0;color:#1e293b;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
    <div style="background:#dc2626;padding:20px 24px;color:#ffffff;">
      <h2 style="margin:0;font-size:18px;font-weight:700;">🚩 Nouveau signalement d'erreur produit</h2>
      <p style="margin:4px 0 0;font-size:12px;opacity:0.9;">Allo Halal — Alerte Back-Office</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 14px;font-weight:700;color:#475569;width:36%;">Produit :</td>
          <td style="padding:10px 14px;font-weight:700;color:#0f172a;">${escapeHtml(cleanProductName)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 14px;font-weight:700;color:#475569;">Code-barres :</td>
          <td style="padding:10px 14px;font-family:monospace;color:#0f172a;">${escapeHtml(cleanBarcode)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 14px;font-weight:700;color:#475569;">Type d'erreur :</td>
          <td style="padding:10px 14px;color:#dc2626;font-weight:600;">${escapeHtml(typeLabel)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 14px;font-weight:700;color:#475569;">Signalé par :</td>
          <td style="padding:10px 14px;color:#2563eb;">${escapeHtml(reporterLabel)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:700;color:#475569;">Date :</td>
          <td style="padding:10px 14px;color:#64748b;">${escapeHtml(dateStr)}</td>
        </tr>
      </table>

      <div style="margin-top:18px;padding:14px 16px;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#be123c;margin-bottom:6px;">Message de l'utilisateur</div>
        <div style="font-size:13.5px;line-height:1.55;color:#1e293b;white-space:pre-wrap;">${escapeHtml(String(message).trim())}</div>
      </div>

      <div style="text-align:center;margin-top:22px;">
        <a href="${adminOrigin}" style="display:inline-block;background:#088839;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 22px;border-radius:10px;">
          Ouvrir le Back-Office Allo Halal
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

          const results = await Promise.all(
            recipients.map((to) => sendSmtpEmail(emailCfg.smtpConfig, to, subject, html).catch(() => null))
          );
          emailSent = results.some((r) => r?.success);
        }
      }
    } catch (mailErr) {
      console.warn('Error report email alert failed:', mailErr);
    }

    return NextResponse.json({ success: true, report, emailSent });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to submit report.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, adminNote, reviewedBy } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Report ID is required.' }, { status: 400 });
    }
    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    const res = await db.query(
      `UPDATE public.product_error_reports
       SET status = COALESCE($1, status),
           admin_note = COALESCE($2, admin_note),
           reviewed_by = COALESCE($3, reviewed_by),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status || null, adminNote ?? null, reviewedBy || null, id]
    );

    return NextResponse.json({ success: true, report: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update report.' }, { status: 500 });
  }
}
