import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-do-not-use";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface TokenPayload {
  userId: string;
  type: "access" | "refresh";
}

/**
 * Create a short-lived access token (15 min default)
 */
export function createAccessToken(
  userId: string,
  expiresIn: string = ACCESS_TOKEN_EXPIRY
): string {
  return jwt.sign({ userId, type: "access" }, JWT_SECRET, { expiresIn });
}

/**
 * Create a long-lived refresh token (7 days)
 */
export function createRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify and decode an access token. Returns null if invalid/expired.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (payload.type !== "access") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token. Returns null if invalid/expired.
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (payload.type !== "refresh") return null;
    return payload;
  } catch {
    return null;
  }
}
