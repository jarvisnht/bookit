import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * GET /api/v1/bookings — List my bookings (scoped by role)
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const upcoming = searchParams.get("upcoming") === "true";

    const where: Record<string, unknown> = {
      customerId: auth.userId,
    };

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      where.startTime = { gte: new Date() };
      where.status = { in: ["PENDING", "CONFIRMED"] };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: { select: { name: true, durationMinutes: true, price: true, currency: true } },
        serviceProvider: { select: { displayName: true } },
        business: { select: { name: true, slug: true, timezone: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("List bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
