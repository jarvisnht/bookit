// Mock Anthropic SDK - must be hoisted before imports
const mockAnthropicCreate = jest.fn();
jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockAnthropicCreate,
    },
  })),
}));

import { handleMessage } from "@/lib/bot/conversation";

// Mock prisma
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
    business: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    businessMembership: {
      findUnique: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from "@/lib/db";
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Conversation Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (mockPrisma.conversation.create as jest.Mock).mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      businessId: "biz-1",
      channel: "WEB_CHAT",
      messages: [],
    });

    (mockPrisma.message.create as jest.Mock).mockResolvedValue({});

    (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
      id: "biz-1",
      name: "Fresh Cuts",
      description: "Barbershop",
      timezone: "America/New_York",
      autoConfirmBookings: true,
      reminderLeadTimeMinutes: 60,
      services: [
        { id: "s1", name: "Classic Cut", durationMinutes: 30, price: 35, category: "Haircuts" },
      ],
      serviceProviders: [
        {
          id: "p1",
          displayName: "Marcus",
          providerServices: [{ service: { name: "Classic Cut" } }],
        },
      ],
    });

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      firstName: "Alex",
      lastName: "T",
    });

    (mockPrisma.businessMembership.findUnique as jest.Mock).mockResolvedValue({
      role: "CUSTOMER",
    });

    (mockPrisma.booking.count as jest.Mock).mockResolvedValue(0);
  });

  it("creates a new conversation when none exists", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "Hello! How can I help you?" }],
    });

    const result = await handleMessage({
      userId: "user-1",
      businessId: "biz-1",
      message: "Hi",
      channel: "WEB_CHAT",
    });

    expect(result.conversationId).toBe("conv-1");
    expect(result.response).toBe("Hello! How can I help you?");
    expect(mockPrisma.conversation.create).toHaveBeenCalled();
  });

  it("resumes existing conversation", async () => {
    (mockPrisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      id: "conv-existing",
      messages: [
        { role: "USER", content: "Hi", createdAt: new Date(1) },
        { role: "ASSISTANT", content: "Hello!", createdAt: new Date(2) },
      ],
    });

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "Sure, let me check availability." }],
    });

    const result = await handleMessage({
      userId: "user-1",
      businessId: "biz-1",
      message: "I want a haircut",
      channel: "WEB_CHAT",
      conversationId: "conv-existing",
    });

    expect(result.conversationId).toBe("conv-existing");
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  it("handles tool use and returns final response", async () => {
    // First call returns tool use
    mockAnthropicCreate
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tool-1",
            name: "search_services",
            input: { businessId: "biz-1" },
          },
        ],
      })
      // Second call returns text after tool result
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "We have Classic Cut for $35." }],
      });

    // Mock the service search
    (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([
      { id: "s1", name: "Classic Cut", durationMinutes: 30, price: 35 },
    ]);

    const result = await handleMessage({
      userId: "user-1",
      businessId: "biz-1",
      message: "What services do you have?",
      channel: "WEB_CHAT",
    });

    expect(result.response).toBe("We have Classic Cut for $35.");
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(2);
  });

  it("persists messages in the database", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "Hello!" }],
    });

    await handleMessage({
      userId: "user-1",
      businessId: "biz-1",
      message: "Hi",
      channel: "SMS",
    });

    // Should persist: user message + assistant response = 2 creates
    expect(mockPrisma.message.create).toHaveBeenCalledTimes(2);

    // First call: user message
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "USER",
          content: "Hi",
          channel: "SMS",
        }),
      })
    );

    // Second call: assistant response
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
          content: "Hello!",
        }),
      })
    );
  });

  it("throws when business not found", async () => {
    (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      handleMessage({
        userId: "user-1",
        businessId: "nonexistent",
        message: "Hi",
        channel: "WEB_CHAT",
      })
    ).rejects.toThrow("Business not found");
  });
});
