/**
 * Channel-agnostic message router.
 * Normalizes inbound messages from any channel (SMS, Web Chat)
 * and routes them to the conversation handler.
 */

import prisma from "@/lib/db";
import { handleMessage } from "./conversation";

export interface InboundMessage {
  channel: "SMS" | "WEB_CHAT";
  // SMS: phone number, WEB_CHAT: userId
  senderId: string;
  // For SMS, determined by the Twilio number called
  businessId?: string;
  businessSlug?: string;
  content: string;
  conversationId?: string;
  // Twilio-specific
  twilioSid?: string;
}

export interface OutboundMessage {
  channel: "SMS" | "WEB_CHAT";
  recipientId: string;
  content: string;
  conversationId: string;
}

/**
 * Route an inbound message to the bot and return the response.
 */
export async function routeMessage(msg: InboundMessage): Promise<OutboundMessage> {
  // Resolve user ID
  let userId: string;

  if (msg.channel === "SMS") {
    // Look up user by phone number
    const user = await prisma.user.findFirst({
      where: { phone: msg.senderId },
    });

    if (!user) {
      // Create new user from phone number (registration flow)
      const newUser = await prisma.user.create({
        data: { phone: msg.senderId },
      });
      userId = newUser.id;

      // If business is known, create customer membership
      const businessId = await resolveBusinessId(msg);
      if (businessId) {
        await prisma.businessMembership.create({
          data: { userId: newUser.id, businessId, role: "CUSTOMER" },
        }).catch(() => {/* ignore duplicate */});
      }
    } else {
      userId = user.id;
    }
  } else {
    // WEB_CHAT: senderId is the userId (authenticated)
    userId = msg.senderId;
  }

  // Resolve business ID
  const businessId = await resolveBusinessId(msg);
  if (!businessId) {
    return {
      channel: msg.channel,
      recipientId: msg.senderId,
      content: "Sorry, I couldn't identify the business. Please try again.",
      conversationId: "",
    };
  }

  // Find or resume conversation
  let conversationId = msg.conversationId;
  if (!conversationId && msg.channel === "SMS") {
    // For SMS, try to find an active conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        userId,
        businessId,
        channel: "SMS",
        status: "ACTIVE",
      },
      orderBy: { updatedAt: "desc" },
    });
    conversationId = existing?.id;
  }

  const result = await handleMessage({
    userId,
    businessId,
    message: msg.content,
    channel: msg.channel,
    conversationId,
  });

  return {
    channel: msg.channel,
    recipientId: msg.senderId,
    content: result.response,
    conversationId: result.conversationId,
  };
}

/**
 * Resolve business ID from message context.
 */
async function resolveBusinessId(msg: InboundMessage): Promise<string | null> {
  if (msg.businessId) return msg.businessId;

  if (msg.businessSlug) {
    const biz = await prisma.business.findUnique({
      where: { slug: msg.businessSlug },
      select: { id: true },
    });
    return biz?.id || null;
  }

  return null;
}
