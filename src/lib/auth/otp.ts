import crypto from "crypto";
import bcryptjs from "bcryptjs";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const SALT_ROUNDS = 10;

/**
 * Generate a cryptographically random 6-digit OTP
 */
export function generateOtp(): string {
  const max = Math.pow(10, OTP_LENGTH);
  const randomNumber = crypto.randomInt(0, max);
  return randomNumber.toString().padStart(OTP_LENGTH, "0");
}

/**
 * Hash an OTP using bcrypt for secure storage
 */
export async function hashOtp(otp: string): Promise<string> {
  return bcryptjs.hash(otp, SALT_ROUNDS);
}

/**
 * Verify an OTP against a bcrypt hash
 */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  if (!otp) return false;
  return bcryptjs.compare(otp, hash);
}

/**
 * Check if an OTP expiry date has passed
 */
export function isOtpExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}

/**
 * Get expiry date for a new OTP (5 minutes from now)
 */
export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}
