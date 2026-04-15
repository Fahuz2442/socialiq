import { db } from '../db/client.js';
import { encrypt, decrypt } from '../config/crypto.js';

/**
 * Save or update an OAuth token for a user+platform.
 * Tokens are AES-encrypted before being stored.
 */
export async function saveToken(userId, platform, tokenData) {
  const {
    accessToken,
    refreshToken = null,
    tokenType = 'Bearer',
    expiresIn = null,       // seconds until expiry
    scopes = [],
    platformUserId = null,
    platformUsername = null,
  } = tokenData;

  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  await db.query(
    `INSERT INTO platform_tokens
       (user_id, platform, access_token, refresh_token, token_type, scopes,
        expires_at, platform_user_id, platform_username)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, platform) DO UPDATE SET
       access_token       = EXCLUDED.access_token,
       refresh_token      = EXCLUDED.refresh_token,
       token_type         = EXCLUDED.token_type,
       scopes             = EXCLUDED.scopes,
       expires_at         = EXCLUDED.expires_at,
       platform_user_id   = EXCLUDED.platform_user_id,
       platform_username  = EXCLUDED.platform_username,
       updated_at         = NOW()`,
    [
      userId,
      platform,
      encrypt(accessToken),
      refreshToken ? encrypt(refreshToken) : null,
      tokenType,
      scopes,
      expiresAt,
      platformUserId,
      platformUsername,
    ]
  );
}

/**
 * Get a decrypted token for a user+platform.
 * Returns null if not found or expired.
 */
export async function getToken(userId, platform) {
  const { rows } = await db.query(
    `SELECT * FROM platform_tokens
     WHERE user_id = $1 AND platform = $2`,
    [userId, platform]
  );

  if (!rows.length) return null;

  const row = rows[0];

  // Check expiry
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ...row, expired: true, accessToken: decrypt(row.access_token) };
  }

  return {
    ...row,
    expired: false,
    accessToken: decrypt(row.access_token),
    refreshToken: row.refresh_token ? decrypt(row.refresh_token) : null,
  };
}

/**
 * List all connected platforms for a user.
 */
export async function getConnectedPlatforms(userId) {
  const { rows } = await db.query(
    `SELECT platform, platform_username, platform_user_id,
            connected_at, expires_at,
            (expires_at IS NOT NULL AND expires_at < NOW()) AS is_expired
     FROM platform_tokens
     WHERE user_id = $1
     ORDER BY connected_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Disconnect (delete) a platform token.
 */
export async function deleteToken(userId, platform) {
  await db.query(
    'DELETE FROM platform_tokens WHERE user_id = $1 AND platform = $2',
    [userId, platform]
  );
}
