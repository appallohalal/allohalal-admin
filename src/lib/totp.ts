import crypto from 'crypto';
import { Pool } from 'pg';

// ==============================================================================
// 1. Shared Database Connection Pool
// ==============================================================================
let pool: Pool | null = null;

export function getDbPool(): Pool | null {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

// ==============================================================================
// 2. AES-256-GCM Secret Encryption & Decryption at Rest
// ==============================================================================
function getEncryptionKey(): Buffer {
  const secretSource =
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||
    process.env.DATABASE_URL ||
    'allo-halal-admin-2fa-vault-key-2026';
  return crypto.createHash('sha256').update(secretSource).digest();
}

export interface EncryptedSecret {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encryptSecret(plainSecret: string): EncryptedSecret {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainSecret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

export function decryptSecret(encryptedHex: string, ivHex: string, tagHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ==============================================================================
// 3. RFC 4648 Base32 Encoding & Decoding
// ==============================================================================
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(str: string): Buffer {
  // Clean string: uppercase, remove spaces, dashes, and padding
  const cleaned = str.toUpperCase().replace(/[\s\-=]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// ==============================================================================
// 4. RFC 6238 TOTP Core Algorithm
// ==============================================================================
export function generateBase32Secret(byteLength: number = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return base32Encode(randomBytes);
}

export function generateTOTP(
  secretBuffer: Buffer,
  timeStep: bigint | number,
  digits: number = 6
): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

export interface VerifyTotpResult {
  valid: boolean;
  matchedStep?: bigint;
  delta?: number;
  reason?: string;
}

/**
 * Verifies a 6-digit TOTP code against a Base32 secret according to RFC 6238.
 * Tolerates +/- window intervals (30 seconds each) to accommodate device clock skew.
 * Prevents replay attacks by checking against lastVerifiedStep.
 */
export function verifyTOTP(
  secretBase32: string,
  code: string,
  options?: {
    window?: number; // default +/- 1 (i.e. -30s to +30s)
    lastVerifiedStep?: bigint | number | null;
    timestampMs?: number; // default Date.now()
  }
): VerifyTotpResult {
  if (!code || typeof code !== 'string') {
    return { valid: false, reason: 'Missing code' };
  }

  const cleanedCode = code.trim().replace(/\s+/g, '');
  if (cleanedCode.length !== 6 || !/^\d{6}$/.test(cleanedCode)) {
    return { valid: false, reason: 'Code must be exactly 6 digits' };
  }

  const secretBuffer = base32Decode(secretBase32);
  if (secretBuffer.length === 0) {
    return { valid: false, reason: 'Invalid secret format' };
  }

  const nowMs = options?.timestampMs ?? Date.now();
  const currentStep = BigInt(Math.floor(nowMs / 1000 / 30));
  const windowTolerance = options?.window ?? 1; // default window: -1, 0, +1
  const lastStep = options?.lastVerifiedStep != null ? BigInt(options.lastVerifiedStep) : null;

  for (let delta = -windowTolerance; delta <= windowTolerance; delta++) {
    const checkStep = currentStep + BigInt(delta);

    // Prevent replay attacks: cannot reuse code from same or earlier verified time step
    if (lastStep != null && checkStep <= lastStep) {
      continue;
    }

    const expectedCode = generateTOTP(secretBuffer, checkStep, 6);

    // Constant-time comparison
    if (
      expectedCode.length === cleanedCode.length &&
      crypto.timingSafeEqual(Buffer.from(expectedCode), Buffer.from(cleanedCode))
    ) {
      return {
        valid: true,
        matchedStep: checkStep,
        delta,
      };
    }
  }

  return { valid: false, reason: 'Invalid authenticator code or expired code' };
}

/**
 * Standard Authenticator URI for Google Authenticator, Microsoft Authenticator, 1Password, Authy
 */
export function getAuthenticatorUri(
  secretBase32: string,
  accountEmail: string,
  issuer: string = 'Allo Halal Admin'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(accountEmail);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// ==============================================================================
// 5. Security Audit Logging
// ==============================================================================
export interface SecurityAuditParams {
  eventType:
    | '2FA_ENROLLED'
    | '2FA_VERIFIED'
    | '2FA_ENABLED'
    | '2FA_DISABLED'
    | '2FA_RESET'
    | '2FA_RECONFIGURED'
    | '2FA_FAILED_ATTEMPT'
    | '2FA_LOCKED'
    | '2FA_LOGIN_SUCCESS';
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any>;
}

export async function logSecurityAuditEvent(params: SecurityAuditParams): Promise<void> {
  try {
    const db = getDbPool();
    if (!db) return;

    await db.query(
      `
      INSERT INTO public.security_audit_logs (
        event_type,
        actor_id,
        actor_email,
        actor_role,
        target_user_id,
        target_user_email,
        ip_address,
        user_agent,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `,
      [
        params.eventType,
        params.actorId || null,
        params.actorEmail || null,
        params.actorRole || null,
        params.targetUserId || null,
        params.targetUserEmail || null,
        params.ipAddress || null,
        params.userAgent || null,
        JSON.stringify(params.details || {}),
      ]
    );
  } catch (err) {
    console.error('Failed to log security audit event:', err);
  }
}

