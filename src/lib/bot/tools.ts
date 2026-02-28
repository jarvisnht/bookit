/**
 * Bot tool handler implementations.
 * Each function corresponds to a Claude tool-use function.
 * Returns structured results for Claude to format as natural language.
 */

import prisma from "@/lib/db";
import { getAvailableSlots } from "@/lib/booking/availability";
import { validateBookingTime, validateNoDoubleBooking, validateServiceProviderMatch } from "@/lib/booking/validation";
import { AvailabilitySchedule, AvailabilityOverrideData, TimeSlot } from "@/types";

// ─── Tool Result Types ──────────────────────────────────

interface ToolResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

// ─── search_services ────────────────────────────────────

export async function searchServices(params: {
  businessId: string;
  query?: string;
}): Promise<ToolResult & { services?: unknown[] }> {
  const { businessId, query } = params;

  const services = await prisma.service.findMany({
    where: {
      businessId,
      isActive: true,
      ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      price: true,
      currency: true,
      category: true,
    },
  });

  return { success: true, services };
}

// ─── get_providers ──────────────────────────────────────

export async function getProviders(params: {
  businessId: string;
  serviceId?: string;
}): Promise<ToolResult & { providers?: unknown[] }> {
  const { businessId, serviceId } = params;

  const providers = await prisma.serviceProvider.findMany({
    where: {
      businessId,
      isActive: true,
      ...(serviceId ? { providerServices: { some: { serviceId } } } : {}),
    },
    select: {
      id: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      providerServices: {
        include: {
          service: { select: { id: true, name: true } },
        },
      },
    },
  });

  return { success: true, providers };
}

// ─── search_availability ────────────────────────────────

export async function searchAvailability(params: {
  businessId: string;
  serviceId: string;
  providerId?: string;
  date: string;
  days?: number;
}): Promise<ToolResult & { availability?: Record<string, unknown[]> }> {
  const { businessId, serviceId, providerId, date, days = 7 } = params;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, isActive: true },
  });

  if (!service) {
    return { success: false, error: "Service not found" };
  }

  const providers = await prisma.serviceProvider.findMany({
    where: {
      businessId,
      isActive: true,
      ...(providerId ? { id: providerId } : {}),
      providerServices: { some: { serviceId } },
    },
    include: {
      availabilities: true,
      availabilityOverrides: true,
    },
  });

  if (providers.length === 0) {
    return { success: false, error: "No providers available for this service" };
  }

  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  const providerIds = providers.map((p) => p.id);
  const existingBookings = await prisma.booking.findMany({
    where: {
      businessId,
      serviceProviderId: { in: providerIds },
      startTime: { gte: startDate },
      endTime: { lte: endDate },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { serviceProviderId: true, startTime: true, endTime: true },
  });

  const availability: Record<string, unknown[]> = {};

  for (let d = 0; d < days; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + d);
    const dateKey = currentDate.toISOString().split("T")[0];
    availability[dateKey] = [];

    for (const provider of providers) {
      const schedule: AvailabilitySchedule[] = provider.availabilities.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      }));

      const overrides: AvailabilityOverrideData[] = provider.availabilityOverrides.map((o) => ({
        date: o.date,
        startTime: o.startTime,
        endTime: o.endTime,
        isBlocked: o.isBlocked,
      }));

      const providerBookings: TimeSlot[] = existingBookings
        .filter((b) => b.serviceProviderId === provider.id)
        .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

      const slots = getAvailableSlots(schedule, overrides, providerBookings, currentDate, service.durationMinutes);

      availability[dateKey].push(
        ...slots.map((slot) => ({
          startTime: slot.startTime.toISOString(),
          endTime: slot.endTime.toISOString(),
          providerId: provider.id,
          providerName: provider.displayName,
        }))
      );
    }
  }

  return {
    success: true,
    service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes, price: Number(service.price) },
    availability,
  };
}

// ─── create_booking ─────────────────────────────────────

export async function createBooking(params: {
  businessId: string;
  customerId: string;
  serviceId: string;
  providerId: string;
  startTime: string;
}): Promise<ToolResult & { booking?: unknown }> {
  const { businessId, customerId, serviceId, providerId, startTime: startTimeStr } = params;
  const startTime = new Date(startTimeStr);

  const timeCheck = validateBookingTime(startTime);
  if (!timeCheck.valid) {
    return { success: false, error: timeCheck.error };
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, isActive: true },
  });

  if (!service) {
    return { success: false, error: "Service not found" };
  }

  const providerServices = await prisma.providerService.findMany({
    where: { serviceProviderId: providerId },
    select: { serviceId: true },
  });

  const matchCheck = validateServiceProviderMatch(serviceId, providerServices.map((ps) => ps.serviceId));
  if (!matchCheck.valid) {
    return { success: false, error: matchCheck.error };
  }

  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

  const existingBookings = await prisma.booking.findMany({
    where: {
      businessId,
      serviceProviderId: providerId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { startTime: true, endTime: true },
  });

  const doubleBookCheck = validateNoDoubleBooking({ startTime, endTime }, existingBookings);
  if (!doubleBookCheck.valid) {
    return { success: false, error: doubleBookCheck.error };
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { autoConfirmBookings: true },
  });

  const booking = await prisma.booking.create({
    data: {
      businessId,
      customerId,
      serviceProviderId: providerId,
      serviceId,
      startTime,
      endTime,
      status: business?.autoConfirmBookings ? "CONFIRMED" : "PENDING",
      confirmationType: business?.autoConfirmBookings ? "AUTO" : "MANUAL",
    },
    include: {
      service: { select: { name: true, durationMinutes: true, price: true } },
      serviceProvider: { select: { displayName: true } },
    },
  });

  return { success: true, booking };
}

// ─── cancel_booking ─────────────────────────────────────

export async function cancelBooking(params: {
  bookingId: string;
  userId: string;
  reason?: string;
}): Promise<ToolResult> {
  const { bookingId, userId, reason } = params;

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [
        { customerId: userId },
        { serviceProvider: { userId } },
      ],
    },
  });

  if (!booking) {
    return { success: false, error: "Booking not found" };
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    return { success: false, error: "This booking cannot be cancelled" };
  }

  const isCustomer = booking.customerId === userId;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancellationReason: reason,
      cancelledBy: isCustomer ? "CUSTOMER" : "PROVIDER",
    },
  });

  return { success: true, booking: updated };
}

// ─── confirm_booking ────────────────────────────────────

export async function confirmBooking(params: {
  bookingId: string;
  userId: string;
}): Promise<ToolResult> {
  const { bookingId, userId } = params;

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      serviceProvider: { userId },
    },
    include: { serviceProvider: { select: { userId: true } } },
  });

  if (!booking) {
    return { success: false, error: "Booking not found" };
  }

  if (booking.status !== "PENDING") {
    return { success: false, error: "Only pending bookings can be confirmed" };
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED", confirmationType: "MANUAL" },
  });

  return { success: true, booking: updated };
}

// ─── get_my_bookings ────────────────────────────────────

export async function getMyBookings(params: {
  userId: string;
  status?: string;
  upcoming?: boolean;
}): Promise<ToolResult & { bookings?: unknown[] }> {
  const { userId, status, upcoming } = params;

  const where: Record<string, unknown> = { customerId: userId };

  if (status) where.status = status;
  if (upcoming) {
    where.startTime = { gte: new Date() };
    where.status = { in: ["PENDING", "CONFIRMED"] };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: { select: { name: true, durationMinutes: true, price: true, currency: true } },
      serviceProvider: { select: { displayName: true } },
      business: { select: { name: true, timezone: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return { success: true, bookings };
}

// ─── update_profile ─────────────────────────────────────

export async function updateProfile(params: {
  userId: string;
  fields: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    preferredContactMethod?: string;
  };
}): Promise<ToolResult & { user?: unknown }> {
  const { userId, fields } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fields.firstName !== undefined && { firstName: fields.firstName }),
      ...(fields.lastName !== undefined && { lastName: fields.lastName }),
      ...(fields.email !== undefined && { email: fields.email }),
      ...(fields.phone !== undefined && { phone: fields.phone }),
      ...(fields.preferredContactMethod !== undefined && {
        preferredContactMethod: fields.preferredContactMethod as "SMS" | "EMAIL" | "WEB_CHAT",
      }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      preferredContactMethod: true,
    },
  });

  return { success: true, user };
}
