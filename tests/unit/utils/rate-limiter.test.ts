import { checkRateLimit, resetRateLimit, RateLimitConfig } from "@/lib/utils/rate-limiter";

describe("Rate Limiter", () => {
  const config: RateLimitConfig = { maxRequests: 3, windowMs: 1000 };

  beforeEach(() => {
    // Reset by using a unique key each test via the test name
  });

  it("allows requests under the limit", () => {
    const key = `test-under-${Date.now()}`;
    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const key = `test-over-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets rate limit for a key", () => {
    const key = `test-reset-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    expect(checkRateLimit(key, config).allowed).toBe(false);

    resetRateLimit(key);
    expect(checkRateLimit(key, config).allowed).toBe(true);
  });

  it("allows requests after window expires", async () => {
    const shortConfig: RateLimitConfig = { maxRequests: 1, windowMs: 50 };
    const key = `test-expire-${Date.now()}`;
    checkRateLimit(key, shortConfig);
    expect(checkRateLimit(key, shortConfig).allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));
    expect(checkRateLimit(key, shortConfig).allowed).toBe(true);
  });

  it("uses different counters for different keys", () => {
    const key1 = `test-diff1-${Date.now()}`;
    const key2 = `test-diff2-${Date.now()}`;
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    expect(checkRateLimit(key1, config).allowed).toBe(false);
    expect(checkRateLimit(key2, config).allowed).toBe(true);
  });
});
