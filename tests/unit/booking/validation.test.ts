import {
  validateBookingTime,
  validateNoDoubleBooking,
  validateServiceProviderMatch,
} from "@/lib/booking/validation";
import { TimeSlot } from "@/types";

describe("Booking Validation", () => {
  describe("validateBookingTime", () => {
    it("should accept a booking in the future", () => {
      const future = new Date(Date.now() + 60 * 60 * 1000);
      const result = validateBookingTime(future);
      expect(result.valid).toBe(true);
    });

    it("should reject a booking in the past", () => {
      const past = new Date(Date.now() - 60 * 60 * 1000);
      const result = validateBookingTime(past);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("past");
    });

    it("should reject a booking with invalid date", () => {
      const result = validateBookingTime(new Date("invalid"));
      expect(result.valid).toBe(false);
    });
  });

  describe("validateNoDoubleBooking", () => {
    it("should pass when no existing bookings overlap", () => {
      const slot: TimeSlot = {
        startTime: new Date("2026-03-02T10:00:00Z"),
        endTime: new Date("2026-03-02T10:30:00Z"),
      };
      const result = validateNoDoubleBooking(slot, []);
      expect(result.valid).toBe(true);
    });

    it("should fail when an existing booking overlaps", () => {
      const slot: TimeSlot = {
        startTime: new Date("2026-03-02T10:00:00Z"),
        endTime: new Date("2026-03-02T10:30:00Z"),
      };
      const existing: TimeSlot[] = [
        {
          startTime: new Date("2026-03-02T10:15:00Z"),
          endTime: new Date("2026-03-02T10:45:00Z"),
        },
      ];
      const result = validateNoDoubleBooking(slot, existing);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("conflict");
    });
  });

  describe("validateServiceProviderMatch", () => {
    it("should pass when provider offers the service", () => {
      const providerServiceIds = ["svc-1", "svc-2", "svc-3"];
      const result = validateServiceProviderMatch("svc-2", providerServiceIds);
      expect(result.valid).toBe(true);
    });

    it("should fail when provider does not offer the service", () => {
      const providerServiceIds = ["svc-1", "svc-3"];
      const result = validateServiceProviderMatch("svc-2", providerServiceIds);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not offer");
    });
  });
});
