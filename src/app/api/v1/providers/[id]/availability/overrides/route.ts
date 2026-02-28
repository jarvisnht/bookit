import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * POST /api/v1/providers/:id/availability/overrides — Add override/block
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: providerId } = await params;

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
    const { date, startTime, endTime, isBlocked, reason } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    const override = await prisma.availabilityOverride.create({
      data: {
        serviceProviderId: providerId,
        businessId: provider.businessId,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        isBlocked: isBlocked ?? true,
        reason,
      },
    });

    return NextResponse.json({ override }, { status: 201 });
  } catch (error) {
    console.error("Create override error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
