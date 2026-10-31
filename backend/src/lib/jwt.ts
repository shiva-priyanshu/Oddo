import crypto from 'crypto';

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name?: string;
  permissions?: string[];
  customerId?: string;
  iat: number;
  exp: number;
}

const DEFAULT_SECRET = 'subscriptiq-dev-jwt-secret-replace-in-production';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

/**
 * Sign a payload with HMAC-SHA256 and return an RFC-7519 compliant JWT string.
 */
export function signToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  expiresInSeconds: number = 86400 // 24 hours default
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const fullPayload: TokenPayload = {
    ...payload,
    iat,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Verify a JWT string using timing-safe comparison, expiration check, and required claims.
 */
export function verifyToken(token: string): TokenPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('MALFORMED_TOKEN');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('MALFORMED_TOKEN');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  // Timing-safe comparison to prevent timing side-channel attacks
  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    throw new Error('INVALID_SIGNATURE');
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('MALFORMED_TOKEN');
  }

  // Validate required claims
  if (!payload.userId || !payload.email || !payload.role) {
    throw new Error('MISSING_REQUIRED_CLAIMS');
  }

  if (payload.role !== 'ADMIN' && payload.role !== 'STAFF' && payload.role !== 'CUSTOMER') {
    throw new Error('INVALID_ROLE_CLAIM');
  }

  // Expiration validation
  const nowUnix = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || nowUnix >= payload.exp) {
    throw new Error('TOKEN_EXPIRED');
  }

  return payload;
}
