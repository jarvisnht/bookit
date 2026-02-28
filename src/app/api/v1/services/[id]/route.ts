import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth/middleware";

/**
 * PUT /api/v1/services/:id — Update service (provider/owner)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: serviceId } = await params;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const roleCheck = await requireRole(auth.userId, service.businessId, [
      "OWNER",
      "PROVIDER",
    ]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await request.json();
    const { name, description, durationMinutes, price, currency, category, isActive } = body;

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(durationMinutes !== undefined && { durationMinutes }),
        ...(price !== undefined && { price }),
        ...(currency !== undefined && { currency }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ service: updated });
  } catch (error) {
    console.error("Update service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/services/:id — Deactivate service (provider/owner)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: serviceId } = await params;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const roleCheck = await requireRole(auth.userId, service.businessId, [
      "OWNER",
      "PROVIDER",
    ]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    // Soft delete — just deactivate
    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });

    return NextResponse.json({ service: updated });
  } catch (error) {
    console.error("Delete service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
