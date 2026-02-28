/**
 * Simple in-memory rate limiter.
 * In production, use Redis for multi-instance support.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  OTP_REQUEST: { maxRequests: 5, windowMs: 60 * 60 * 1000 } as RateLimitConfig, // 5/hour
  OTP_VERIFY: { maxRequests: 5, windowMs: 5 * 60 * 1000 } as RateLimitConfig,   // 5/5min
  BOT_MESSAGE: { maxRequests: 30, windowMs: 60 * 1000 } as RateLimitConfig,      // 30/min
  API_GENERAL: { maxRequests: 100, windowMs: 60 * 1000 } as RateLimitConfig,     // 100/min
};

/**
 * Check if a key has exceeded its rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Reset rate limit for a key (e.g., after successful verification).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
