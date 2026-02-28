import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";
import { validateBookingTime, validateNoDoubleBooking, validateServiceProviderMatch } from "@/lib/booking/validation";

/**
 * POST /api/v1/businesses/:id/bookings — Create a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: businessId } = await params;
    const body = await request.json();
    const { serviceId, serviceProviderId, startTime: startTimeStr, notes } = body;

    if (!serviceId || !serviceProviderId || !startTimeStr) {
      return NextResponse.json(
        { error: "serviceId, serviceProviderId, and startTime are required" },
        { status: 400 }
      );
    }

    const startTime = new Date(startTimeStr);

    // Validate booking time is in the future
    const timeCheck = validateBookingTime(startTime);
    if (!timeCheck.valid) {
      return NextResponse.json({ error: timeCheck.error }, { status: 400 });
    }

    // Get service for duration
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId, isActive: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Validate provider offers this service
    const providerServices = await prisma.providerService.findMany({
      where: { serviceProviderId },
      select: { serviceId: true },
    });
    const matchCheck = validateServiceProviderMatch(
      serviceId,
      providerServices.map((ps) => ps.serviceId)
    );
    if (!matchCheck.valid) {
      return NextResponse.json({ error: matchCheck.error }, { status: 400 });
    }

    // Calculate end time
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    // Check for double booking
    const existingBookings = await prisma.booking.findMany({
      where: {
        businessId,
        serviceProviderId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { startTime: true, endTime: true },
    });

    const doubleBookCheck = validateNoDoubleBooking(
      { startTime, endTime },
      existingBookings
    );
    if (!doubleBookCheck.valid) {
      return NextResponse.json({ error: doubleBookCheck.error }, { status: 409 });
    }

    // Check business auto-confirm setting
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { autoConfirmBookings: true },
    });

    const booking = await prisma.booking.create({
      data: {
        businessId,
        customerId: auth.userId,
        serviceProviderId,
        serviceId,
        startTime,
        endTime,
        status: business?.autoConfirmBookings ? "CONFIRMED" : "PENDING",
        confirmationType: business?.autoConfirmBookings ? "AUTO" : "MANUAL",
        notes,
      },
      include: {
        service: { select: { name: true, durationMinutes: true, price: true } },
        serviceProvider: { select: { displayName: true } },
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
