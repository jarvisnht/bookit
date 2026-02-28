import {
  searchServices,
  searchAvailability,
  createBooking,
  cancelBooking,
  getMyBookings,
  updateProfile,
  getProviders,
  confirmBooking,
} from "@/lib/bot/tools";

// Mock prisma
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    service: { findMany: jest.fn() },
    serviceProvider: { findMany: jest.fn() },
    providerService: { findMany: jest.fn() },
    availability: { findMany: jest.fn() },
    availabilityOverride: { findMany: jest.fn() },
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    business: { findUnique: jest.fn() },
    user: { update: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      service: { findFirst: jest.fn() },
      providerService: { findFirst: jest.fn() },
      business: { findUnique: jest.fn() },
    })),
  },
}));

import prisma from "@/lib/db";
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Bot Tool Handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchServices", () => {
    it("returns active services for a business", async () => {
      const mockServices = [
        { id: "s1", name: "Classic Cut", description: "Haircut", durationMinutes: 30, price: 35, currency: "USD", category: "Haircuts" },
        { id: "s2", name: "Classic Fade", description: "Fade cut", durationMinutes: 45, price: 45, currency: "USD", category: "Haircuts" },
      ];
      (mockPrisma.service.findMany as jest.Mock).mockResolvedValue(mockServices);

      const result = await searchServices({ businessId: "biz-1" });
      expect(result.success).toBe(true);
      expect(result.services).toHaveLength(2);
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ businessId: "biz-1", isActive: true }),
        })
      );
    });

    it("filters by query when provided", async () => {
      (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([]);
      await searchServices({ businessId: "biz-1", query: "fade" });
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ contains: "fade" }),
          }),
        })
      );
    });
  });

  describe("getProviders", () => {
    it("returns active providers for a business", async () => {
      const mockProviders = [
        { id: "p1", displayName: "Marcus J.", bio: "Master barber" },
      ];
      (mockPrisma.serviceProvider.findMany as jest.Mock).mockResolvedValue(mockProviders);

      const result = await getProviders({ businessId: "biz-1" });
      expect(result.success).toBe(true);
      expect(result.providers).toHaveLength(1);
    });

    it("filters by serviceId when provided", async () => {
      (mockPrisma.serviceProvider.findMany as jest.Mock).mockResolvedValue([]);
      await getProviders({ businessId: "biz-1", serviceId: "s1" });
      expect(mockPrisma.serviceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            providerServices: { some: { serviceId: "s1" } },
          }),
        })
      );
    });
  });

  describe("getMyBookings", () => {
    it("returns bookings for a user", async () => {
      const mockBookings = [
        {
          id: "b1",
          startTime: new Date("2026-03-01T10:00:00Z"),
          endTime: new Date("2026-03-01T10:45:00Z"),
          status: "CONFIRMED",
          service: { name: "Classic Fade" },
          serviceProvider: { displayName: "Marcus J." },
        },
      ];
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

      const result = await getMyBookings({ userId: "user-1" });
      expect(result.success).toBe(true);
      expect(result.bookings).toHaveLength(1);
    });

    it("filters by upcoming when specified", async () => {
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      await getMyBookings({ userId: "user-1", upcoming: true });
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["PENDING", "CONFIRMED"] },
          }),
        })
      );
    });
  });

  describe("cancelBooking", () => {
    it("cancels a pending/confirmed booking", async () => {
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: "b1",
        status: "CONFIRMED",
        customerId: "user-1",
      });
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({
        id: "b1",
        status: "CANCELLED",
        cancelledBy: "CUSTOMER",
      });

      const result = await cancelBooking({
        bookingId: "b1",
        userId: "user-1",
        reason: "Can't make it",
      });
      expect(result.success).toBe(true);
    });

    it("rejects cancelling an already cancelled booking", async () => {
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: "b1",
        status: "CANCELLED",
      });

      const result = await cancelBooking({ bookingId: "b1", userId: "user-1" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot be cancelled");
    });

    it("returns error for non-existent booking", async () => {
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await cancelBooking({ bookingId: "none", userId: "user-1" });
      expect(result.success).toBe(false);
    });
  });

  describe("confirmBooking", () => {
    it("confirms a pending booking", async () => {
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: "b1",
        status: "PENDING",
        serviceProvider: { userId: "provider-1" },
      });
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({
        id: "b1",
        status: "CONFIRMED",
      });

      const result = await confirmBooking({
        bookingId: "b1",
        userId: "provider-1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects confirming non-pending booking", async () => {
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: "b1",
        status: "CONFIRMED",
        serviceProvider: { userId: "provider-1" },
      });

      const result = await confirmBooking({ bookingId: "b1", userId: "provider-1" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateProfile", () => {
    it("updates user profile fields", async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: "user-1",
        firstName: "Alex",
        lastName: "New",
        email: "alex@new.com",
      });

      const result = await updateProfile({
        userId: "user-1",
        fields: { firstName: "Alex", lastName: "New", email: "alex@new.com" },
      });
      expect(result.success).toBe(true);
      expect(result.user.firstName).toBe("Alex");
    });
  });
});
