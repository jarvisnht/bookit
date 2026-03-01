import { ConversationChannel } from "@prisma/client";

/**
 * Channel-agnostic message router.
 * Normalizes inbound messages and formats outbound responses
 * per channel constraints.
 */

export interface InboundMessage {
  userId: string;
  businessId: string;
  channel: ConversationChannel;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface OutboundMessage {
  content: string;
  channel: ConversationChannel;
  metadata?: Record<string, unknown>;
}

/**
 * Format a bot response for the target channel.
 * SMS has character limits; web chat supports rich formatting.
 */
export function formatForChannel(
  content: string,
  channel: ConversationChannel
): string {
  if (channel === "SMS") {
    // SMS: strip markdown, truncate to 1600 chars (Twilio limit)
    let smsContent = content
      .replace(/\*\*(.*?)\*\*/g, "$1") // bold
      .replace(/\*(.*?)\*/g, "$1")     // italic
      .replace(/`(.*?)`/g, "$1")       // code
      .replace(/#{1,6}\s/g, "")        // headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // links → text only

    if (smsContent.length > 1600) {
      smsContent = smsContent.substring(0, 1597) + "...";
    }
    return smsContent;
  }

  // Web chat: return as-is (supports markdown)
  return content;
}
