import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * GET /api/v1/providers/:id/availability — Get provider schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;

    const availabilities = await prisma.availability.findMany({
      where: { serviceProviderId: providerId },
      orderBy: { dayOfWeek: "asc" },
    });

    const overrides = await prisma.availabilityOverride.findMany({
      where: {
        serviceProviderId: providerId,
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ availabilities, overrides });
  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/providers/:id/availability — Update recurring schedule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: providerId } = await params;

    // Verify the user owns this provider profile
    const provider = await prisma.serviceProvider.findFirst({
      where: { id: providerId, userId: auth.userId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found or unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { schedule } = body; // Array of { dayOfWeek, startTime, endTime, isAvailable }

    if (!Array.isArray(schedule)) {
      return NextResponse.json(
        { error: "Schedule must be an array" },
        { status: 400 }
      );
    }

    // Replace entire schedule in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({
        where: { serviceProviderId: providerId },
      });

      await tx.availability.createMany({
        data: schedule.map((s: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }) => ({
          serviceProviderId: providerId,
          businessId: provider.businessId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable,
        })),
      });
    });

    const updated = await prisma.availability.findMany({
      where: { serviceProviderId: providerId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ availabilities: updated });
  } catch (error) {
    console.error("Update availability error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
