import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateOtp, hashOtp, getOtpExpiry } from "@/lib/auth/otp";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email } = body;

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Phone or email is required" },
        { status: 400 }
      );
    }

    const identifier = phone || email;
    const rateLimitKey = `otp:request:${identifier}`;
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.OTP_REQUEST);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Try again later." },
        { status: 429 }
      );
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: phone ? { phone } : { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          ...(phone ? { phone } : { email }),
        },
      });
    }

    // Generate and store OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpExpiresAt = getOtpExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash, otpExpiresAt },
    });

    // TODO: Send OTP via Twilio SMS or email
    // For now, in development, log it
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] OTP for ${identifier}: ${otp}`);
    }

    return NextResponse.json({
      message: "OTP sent successfully",
      // In dev mode, include OTP for testing
      ...(process.env.NODE_ENV === "development" ? { otp } : {}),
    });
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
