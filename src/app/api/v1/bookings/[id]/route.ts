import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * GET /api/v1/bookings/:id — Booking detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        OR: [
          { customerId: auth.userId },
          { serviceProvider: { userId: auth.userId } },
        ],
      },
      include: {
        service: true,
        serviceProvider: { select: { displayName: true, avatarUrl: true } },
        business: { select: { name: true, slug: true, timezone: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/bookings/:id — Update booking (confirm, cancel)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body;

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        OR: [
          { customerId: auth.userId },
          { serviceProvider: { userId: auth.userId } },
        ],
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (action === "confirm") {
      if (booking.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only pending bookings can be confirmed" },
          { status: 400 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "CONFIRMED", confirmationType: "MANUAL" },
      });
      return NextResponse.json({ booking: updated });
    }

    if (action === "cancel") {
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        return NextResponse.json(
          { error: "This booking cannot be cancelled" },
          { status: 400 }
        );
      }

      const isCustomer = booking.customerId === auth.userId;
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledBy: isCustomer ? "CUSTOMER" : "PROVIDER",
        },
      });
      return NextResponse.json({ booking: updated });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'confirm' or 'cancel'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
