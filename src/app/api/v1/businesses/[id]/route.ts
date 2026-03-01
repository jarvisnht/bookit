import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth/middleware";

/**
 * GET /api/v1/businesses/:idOrSlug — Public business profile + services
 * Accepts either a UUID or a slug.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;

    // Determine if it's a UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const business = await prisma.business.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        timezone: true,
        phone: true,
        email: true,
        address: true,
        logoUrl: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            price: true,
            currency: true,
            category: true,
          },
        },
        serviceProviders: {
          where: { isActive: true },
          select: {
            id: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error("Get business error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
      name, description, timezone, phone, email, address, logoUrl,
      autoConfirmBookings, reminderLeadTimeMinutes,
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
