import prisma from "@/lib/db";
import { sendSms } from "@/lib/channels/twilio";
import { NotificationChannel, NotificationStatus } from "@prisma/client";

/**
 * Send a notification through the appropriate channel.
 */
export async function sendNotification(notificationId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: { select: { phone: true, email: true } },
    },
  });

  if (!notification) {
    throw new Error(`Notification ${notificationId} not found`);
  }

  try {
    switch (notification.channel) {
      case "SMS":
        if (!notification.user.phone) {
          throw new Error("User has no phone number for SMS notification");
        }
        await sendSms(notification.user.phone, notification.content);
        break;

      case "EMAIL":
        // TODO: Implement email sending (Phase 4)
        console.log(`[EMAIL] Would send to ${notification.user.email}: ${notification.content}`);
        break;

      case "WEB_CHAT":
        // Web chat notifications are handled via WebSocket/SSE
        // Just mark as sent
        break;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Failed to send notification ${notificationId}:`, error);
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED" },
    });
  }
}

/**
 * Create and send a notification.
 */
export async function createAndSendNotification(params: {
  userId: string;
  businessId: string;
  bookingId?: string;
  type: string;
  channel: NotificationChannel;
  content: string;
}): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      businessId: params.businessId,
      bookingId: params.bookingId,
      type: params.type as any,
      channel: params.channel,
      content: params.content,
    },
  });

  await sendNotification(notification.id);
}
