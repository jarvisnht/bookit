/**
 * Bot conversation handler.
 * Manages the conversation loop with Claude, executing tool calls as needed.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { buildSystemPrompt } from "./system-prompt";
import { TOOL_DEFINITIONS } from "./tool-definitions";
import * as tools from "./tools";

const anthropic = new Anthropic();

const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ITERATIONS = 5;

interface ConversationInput {
  userId: string;
  businessId: string;
  message: string;
  channel: "SMS" | "WEB_CHAT";
  conversationId?: string;
}

interface ConversationOutput {
  response: string;
  conversationId: string;
}

/**
 * Execute a tool call from Claude and return the result.
 */
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string,
  businessId: string
): Promise<string> {
  try {
    let result: unknown;

    switch (toolName) {
      case "search_services":
        result = await tools.searchServices({
          businessId: (toolInput.businessId as string) || businessId,
          query: toolInput.query as string | undefined,
        });
        break;

      case "get_providers":
        result = await tools.getProviders({
          businessId: (toolInput.businessId as string) || businessId,
          serviceId: toolInput.serviceId as string | undefined,
        });
        break;

      case "search_availability":
        result = await tools.searchAvailability({
          businessId: (toolInput.businessId as string) || businessId,
          serviceId: toolInput.serviceId as string,
          providerId: toolInput.providerId as string | undefined,
          date: toolInput.date as string,
          days: toolInput.days as number | undefined,
        });
        break;

      case "create_booking":
        result = await tools.createBooking({
          businessId: (toolInput.businessId as string) || businessId,
          customerId: (toolInput.customerId as string) || userId,
          serviceId: toolInput.serviceId as string,
          providerId: toolInput.providerId as string,
          startTime: toolInput.startTime as string,
        });
        break;

      case "cancel_booking":
        result = await tools.cancelBooking({
          bookingId: toolInput.bookingId as string,
          userId,
          reason: toolInput.reason as string | undefined,
        });
        break;

      case "get_my_bookings":
        result = await tools.getMyBookings({
          userId,
          status: toolInput.status as string | undefined,
          upcoming: toolInput.upcoming as boolean | undefined,
        });
        break;

      case "update_profile":
        result = await tools.updateProfile({
          userId,
          fields: toolInput.fields as Record<string, string>,
        });
        break;

      case "confirm_booking":
        result = await tools.confirmBooking({
          bookingId: toolInput.bookingId as string,
          userId,
        });
        break;

      default:
        result = { success: false, error: `Unknown tool: ${toolName}` };
    }

    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `Tool execution failed: ${(error as Error).message}`,
    });
  }
}

/**
 * Load or create a conversation, build context, call Claude, persist messages.
 */
export async function handleMessage(input: ConversationInput): Promise<ConversationOutput> {
  const { userId, businessId, message, channel } = input;

  // Load or create conversation
  let conversation = input.conversationId
    ? await prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: MAX_HISTORY_MESSAGES,
          },
        },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId,
        businessId,
        channel,
        status: "ACTIVE",
      },
      include: { messages: true },
    });
  }

  // Persist user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: message,
      channel,
    },
  });

  // Build context
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      services: { where: { isActive: true } },
      serviceProviders: {
        where: { isActive: true },
        include: {
          providerServices: {
            include: { service: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const membership = await prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
  });

  const upcomingCount = await prisma.booking.count({
    where: {
      customerId: userId,
      businessId,
      startTime: { gte: new Date() },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  const systemPrompt = buildSystemPrompt(
    {
      name: business.name,
      description: business.description,
      timezone: business.timezone,
      autoConfirmBookings: business.autoConfirmBookings,
      reminderLeadTimeMinutes: business.reminderLeadTimeMinutes,
      services: business.services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: Number(s.price),
        category: s.category,
      })),
      providers: business.serviceProviders.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        services: p.providerServices.map((ps) => ps.service.name),
      })),
    },
    {
      id: userId,
      firstName: user?.firstName,
      lastName: user?.lastName,
      role: membership?.role || "CUSTOMER",
      upcomingBookings: upcomingCount,
    },
    channel
  );

  // Build messages array from conversation history
  const history = (conversation.messages || [])
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  // Add current message
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: message },
  ];

  // Call Claude with tool loop
  let iterations = 0;
  let finalResponse = "";

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    // Collect text and tool use blocks
    const textBlocks = response.content.filter((b) => b.type === "text");
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");

    if (toolBlocks.length === 0) {
      // No tools called — we have our final response
      finalResponse = textBlocks.map((b) => b.type === "text" ? b.text : "").join("");
      break;
    }

    // Add assistant response to messages
    messages.push({ role: "assistant", content: response.content });

    // Execute tools and add results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolBlocks) {
      if (block.type === "tool_use") {
        const toolResult = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          userId,
          businessId
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: toolResult,
        });

        // Persist tool call + result
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: `[Tool: ${block.name}]`,
            toolCalls: block.input as any,
            channel,
          },
        });

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "TOOL_RESULT",
            content: toolResult,
            channel,
          },
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  // Persist assistant response
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: finalResponse,
      channel,
    },
  });

  return {
    response: finalResponse,
    conversationId: conversation.id,
  };
}
