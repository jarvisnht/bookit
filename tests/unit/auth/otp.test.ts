import { generateOtp, hashOtp, verifyOtp, isOtpExpired } from "@/lib/auth/otp";

describe("OTP Module", () => {
  describe("generateOtp", () => {
    it("should generate a 6-digit numeric string", () => {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it("should generate different codes on subsequent calls", () => {
      const codes = new Set(Array.from({ length: 10 }, () => generateOtp()));
      // With 10 random 6-digit codes, extremely unlikely all are the same
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe("hashOtp / verifyOtp", () => {
    it("should hash an OTP and verify it correctly", async () => {
      const otp = "123456";
      const hash = await hashOtp(otp);
      expect(hash).not.toBe(otp);
      expect(await verifyOtp(otp, hash)).toBe(true);
    });

    it("should reject an incorrect OTP", async () => {
      const hash = await hashOtp("123456");
      expect(await verifyOtp("654321", hash)).toBe(false);
    });

    it("should reject an empty OTP", async () => {
      const hash = await hashOtp("123456");
      expect(await verifyOtp("", hash)).toBe(false);
    });
  });

  describe("isOtpExpired", () => {
    it("should return false for a future expiry", () => {
      const future = new Date(Date.now() + 5 * 60 * 1000); // 5 min from now
      expect(isOtpExpired(future)).toBe(false);
    });

    it("should return true for a past expiry", () => {
      const past = new Date(Date.now() - 1000);
      expect(isOtpExpired(past)).toBe(true);
    });

    it("should return true for null expiry", () => {
      expect(isOtpExpired(null)).toBe(true);
    });
  });
});
