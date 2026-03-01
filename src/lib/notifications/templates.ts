import { NotificationType } from "@prisma/client";

interface BookingContext {
  customerName: string;
  providerName: string;
  serviceName: string;
  businessName: string;
  startTime: Date;
  timezone: string;
}

/**
 * Generate notification content based on type and context.
 */
export function getNotificationContent(
  type: NotificationType,
  context: BookingContext
): string {
  const timeStr = context.startTime.toLocaleString("en-US", {
    timeZone: context.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  switch (type) {
    case "BOOKING_CONFIRMATION":
      return `✅ Booking Confirmed!\n${context.serviceName} with ${context.providerName}\n📅 ${timeStr}\n📍 ${context.businessName}`;

    case "BOOKING_REMINDER":
      return `⏰ Reminder: You have ${context.serviceName} with ${context.providerName} coming up!\n📅 ${timeStr}\n📍 ${context.businessName}`;

    case "BOOKING_CANCELLED":
      return `❌ Booking Cancelled\nYour ${context.serviceName} appointment with ${context.providerName} on ${timeStr} has been cancelled.`;

    case "BOOKING_UPDATED":
      return `🔄 Booking Updated\nYour ${context.serviceName} with ${context.providerName} has been updated.\n📅 New time: ${timeStr}`;

    case "WELCOME":
      return `👋 Welcome to ${context.businessName}! You can book appointments by chatting with us here or visiting our booking page.`;

    case "CUSTOM":
      return "";

    default:
      return "";
  }
}
