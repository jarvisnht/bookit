import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";

describe("JWT Module", () => {
  const userId = "test-user-id-123";

  describe("Access Token", () => {
    it("should create and verify an access token", () => {
      const token = createAccessToken(userId);
      const payload = verifyAccessToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(userId);
    });

    it("should reject an invalid token", () => {
      const payload = verifyAccessToken("invalid-token");
      expect(payload).toBeNull();
    });

    it("should reject an expired token", () => {
      // Create token with 0 expiry
      const token = createAccessToken(userId, "0s");
      const payload = verifyAccessToken(token);
      expect(payload).toBeNull();
    });
  });

  describe("Refresh Token", () => {
    it("should create and verify a refresh token", () => {
      const token = createRefreshToken(userId);
      const payload = verifyRefreshToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(userId);
    });

    it("should reject an invalid refresh token", () => {
      const payload = verifyRefreshToken("invalid-token");
      expect(payload).toBeNull();
    });

    it("should not verify an access token as a refresh token", () => {
      const accessToken = createAccessToken(userId);
      const payload = verifyRefreshToken(accessToken);
      expect(payload).toBeNull();
    });
  });
});
