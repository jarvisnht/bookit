import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAvailableSlots } from "@/lib/booking/availability";
import { AvailabilitySchedule, AvailabilityOverrideData, TimeSlot, AvailableSlot } from "@/types";

/**
 * GET /api/v1/businesses/:id/availability — Search availability (public)
 * Query params: serviceId, providerId (optional), date, days (optional, default 7)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get("serviceId");
    const providerId = searchParams.get("providerId");
    const dateStr = searchParams.get("date");
    const days = parseInt(searchParams.get("days") || "7", 10);

    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 }
      );
    }

    // Get the service for duration
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId, isActive: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Get providers for this service
    const providerFilter = providerId
      ? { id: providerId, businessId, isActive: true }
      : { businessId, isActive: true };

    const providers = await prisma.serviceProvider.findMany({
      where: {
        ...providerFilter,
        providerServices: {
          some: { serviceId },
        },
      },
      include: {
        availabilities: true,
        availabilityOverrides: true,
      },
    });

    const startDate = dateStr ? new Date(dateStr) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    // Get existing bookings in the date range for all providers
    const providerIds = providers.map((p) => p.id);
    const existingBookings = await prisma.booking.findMany({
      where: {
        businessId,
        serviceProviderId: { in: providerIds },
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        serviceProviderId: true,
        startTime: true,
        endTime: true,
      },
    });

    // Build availability for each provider, each day
    const availability: Record<string, AvailableSlot[]> = {};

    for (let d = 0; d < days; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const dateKey = date.toISOString().split("T")[0];

      availability[dateKey] = [];

      for (const provider of providers) {
        const schedule: AvailabilitySchedule[] = provider.availabilities.map(
          (a) => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            isAvailable: a.isAvailable,
          })
        );

        const overrides: AvailabilityOverrideData[] =
          provider.availabilityOverrides.map((o) => ({
            date: o.date,
            startTime: o.startTime,
            endTime: o.endTime,
            isBlocked: o.isBlocked,
          }));

        const providerBookings: TimeSlot[] = existingBookings
          .filter((b) => b.serviceProviderId === provider.id)
          .map((b) => ({
            startTime: b.startTime,
            endTime: b.endTime,
          }));

        const slots = getAvailableSlots(
          schedule,
          overrides,
          providerBookings,
          date,
          service.durationMinutes
        );

        const availableSlots: AvailableSlot[] = slots.map((slot) => ({
          ...slot,
          serviceProviderId: provider.id,
          providerName: provider.displayName,
        }));

        availability[dateKey].push(...availableSlots);
      }

      // Sort by start time (first-available strategy)
      availability[dateKey].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
    }

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
      },
      availability,
    });
  } catch (error) {
    console.error("Availability search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
