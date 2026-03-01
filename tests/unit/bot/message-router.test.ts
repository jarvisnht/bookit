// Mock conversation handler
const mockHandleMessage = jest.fn();
jest.mock("@/lib/bot/conversation", () => ({
  handleMessage: mockHandleMessage,
}));

// Mock prisma
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    business: {
      findUnique: jest.fn(),
    },
    businessMembership: {
      create: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
    },
  },
}));

import { routeMessage, InboundMessage } from "@/lib/bot/message-router";
import prisma from "@/lib/db";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Message Router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleMessage.mockResolvedValue({
      response: "Hello!",
      conversationId: "conv-1",
    });
  });

  it("routes web chat messages using senderId as userId", async () => {
    (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({ id: "biz-1" });

    const result = await routeMessage({
      channel: "WEB_CHAT",
      senderId: "user-1",
      businessSlug: "fresh-cuts",
      content: "Hi",
    });

    expect(result.content).toBe("Hello!");
    expect(mockHandleMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        businessId: "biz-1",
        message: "Hi",
        channel: "WEB_CHAT",
      })
    );
  });

  it("routes SMS messages and looks up user by phone", async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-phone",
    });

    const result = await routeMessage({
      channel: "SMS",
      senderId: "+15551234567",
      businessId: "biz-1",
      content: "Book a haircut",
    });

    expect(mockHandleMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-phone" })
    );
  });

  it("creates new user for unknown SMS sender", async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: "new-user",
    });
    (mockPrisma.businessMembership.create as jest.Mock).mockResolvedValue({});

    await routeMessage({
      channel: "SMS",
      senderId: "+15559999999",
      businessId: "biz-1",
      content: "Hello",
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { phone: "+15559999999" },
      })
    );
  });

  it("returns error when business cannot be resolved", async () => {
    (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await routeMessage({
      channel: "WEB_CHAT",
      senderId: "user-1",
      businessSlug: "nonexistent",
      content: "Hi",
    });

    expect(result.content).toContain("couldn't identify");
    expect(mockHandleMessage).not.toHaveBeenCalled();
  });

  it("resumes active SMS conversation", async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: "user-1" });
    (mockPrisma.conversation.findFirst as jest.Mock).mockResolvedValue({
      id: "existing-conv",
    });

    await routeMessage({
      channel: "SMS",
      senderId: "+15551234567",
      businessId: "biz-1",
      content: "Yes, confirm",
    });

    expect(mockHandleMessage).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "existing-conv" })
    );
  });
});
