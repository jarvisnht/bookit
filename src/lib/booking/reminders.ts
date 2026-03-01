import prisma from "@/lib/db";
import { createAndSendNotification } from "@/lib/notifications/sender";
import { getNotificationContent } from "@/lib/notifications/templates";

/**
 * Check for upcoming bookings that need reminders and send them.
 * Should be called periodically (e.g., every 5 minutes via cron).
 */
export async function processReminders(): Promise<number> {
  const now = new Date();
  let remindersSent = 0;

  // Get all businesses with their reminder settings
  const businesses = await prisma.business.findMany({
    where: { subscriptionStatus: { in: ["TRIAL", "ACTIVE"] } },
    select: { id: true, name: true, timezone: true, reminderLeadTimeMinutes: true },
  });

  for (const business of businesses) {
    const reminderWindow = new Date(
      now.getTime() + business.reminderLeadTimeMinutes * 60 * 1000
    );

    // Find bookings that:
    // 1. Are in the reminder window
    // 2. Haven't had a reminder sent yet
    // 3. Are confirmed
    const bookings = await prisma.booking.findMany({
      where: {
        businessId: business.id,
        status: "CONFIRMED",
        reminderSentAt: null,
        startTime: {
          gte: now,
          lte: reminderWindow,
        },
      },
      include: {
        customer: { select: { id: true, firstName: true, phone: true, preferredContactMethod: true } },
        serviceProvider: { select: { displayName: true } },
        service: { select: { name: true } },
      },
    });

    for (const booking of bookings) {
      const content = getNotificationContent("BOOKING_REMINDER", {
        customerName: booking.customer.firstName || "there",
        providerName: booking.serviceProvider.displayName,
        serviceName: booking.service.name,
        businessName: business.name,
        startTime: booking.startTime,
        timezone: business.timezone,
      });

      const channel = booking.customer.preferredContactMethod === "EMAIL" ? "EMAIL" as const :
                       booking.customer.preferredContactMethod === "WEB_CHAT" ? "WEB_CHAT" as const :
                       "SMS" as const;

      await createAndSendNotification({
        userId: booking.customer.id,
        businessId: business.id,
        bookingId: booking.id,
        type: "BOOKING_REMINDER",
        channel,
        content,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });

      remindersSent++;
    }
  }

  return remindersSent;
}
