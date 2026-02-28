import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth/middleware";

/**
 * GET /api/v1/businesses/:id/services — List active services (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    const services = await prisma.service.findMany({
      where: { businessId, isActive: true },
      include: {
        providerServices: {
          include: {
            serviceProvider: {
              select: { id: true, displayName: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error("List services error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/businesses/:id/services — Create service (provider/owner)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: businessId } = await params;

    const roleCheck = await requireRole(auth.userId, businessId, [
      "OWNER",
      "PROVIDER",
    ]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await request.json();
    const { name, description, durationMinutes, price, currency, category } = body;

    if (!name || !durationMinutes || price === undefined) {
      return NextResponse.json(
        { error: "Name, duration, and price are required" },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        businessId,
        name,
        description,
        durationMinutes,
        price,
        currency: currency || "USD",
        category,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
