import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth/middleware";

/**
 * PUT /api/v1/businesses/:id — Update business settings (owner only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: businessId } = await params;

    const roleCheck = await requireRole(auth.userId, businessId, ["OWNER"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await request.json();
    const {
      name,
      description,
      timezone,
      phone,
      email,
      address,
      logoUrl,
      autoConfirmBookings,
      reminderLeadTimeMinutes,
    } = body;

    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(timezone !== undefined && { timezone }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(autoConfirmBookings !== undefined && { autoConfirmBookings }),
        ...(reminderLeadTimeMinutes !== undefined && { reminderLeadTimeMinutes }),
      },
    });

    return NextResponse.json({ business });
  } catch (error) {
    console.error("Update business error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
