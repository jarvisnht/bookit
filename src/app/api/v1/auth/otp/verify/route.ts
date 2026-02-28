import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyOtp, isOtpExpired } from "@/lib/auth/otp";
import { createAccessToken, createRefreshToken } from "@/lib/auth/jwt";
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, otp } = body;

    if (!otp || (!phone && !email)) {
      return NextResponse.json(
        { error: "OTP and phone/email are required" },
        { status: 400 }
      );
    }

    const identifier = phone || email;
    const rateLimitKey = `otp:verify:${identifier}`;
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.OTP_VERIFY);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Try again later." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findFirst({
      where: phone ? { phone } : { email },
    });

    if (!user || !user.otpHash) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    if (isOtpExpired(user.otpExpiresAt)) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 401 }
      );
    }

    const isValid = await verifyOtp(otp, user.otpHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Clear OTP and mark verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        isVerified: true,
      },
    });

    // Reset rate limit after successful verification
    resetRateLimit(rateLimitKey);

    // Issue tokens
    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    const response = NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: true,
      },
    });

    // Set refresh token as httpOnly cookie
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
