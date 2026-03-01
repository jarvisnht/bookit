import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { routeMessage } from "@/lib/bot/message-router";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limiter";

/**
 * POST /api/v1/chat/:businessSlug — Send a message to the booking bot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { businessSlug } = await params;
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Rate limit bot messages
    const rateLimitKey = `bot:${auth.userId}`;
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.BOT_MESSAGE);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many messages. Please slow down." },
        { status: 429 }
      );
    }

    const result = await routeMessage({
      channel: "WEB_CHAT",
      senderId: auth.userId,
      businessSlug,
      content: message.trim(),
      conversationId,
    });

    return NextResponse.json({
      response: result.content,
      conversationId: result.conversationId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
