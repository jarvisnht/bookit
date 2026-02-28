import {
  generateTimeSlots,
  isSlotAvailable,
  getAvailableSlots,
} from "@/lib/booking/availability";
import { AvailabilitySchedule, AvailabilityOverrideData, TimeSlot } from "@/types";

describe("Availability Engine", () => {
  describe("generateTimeSlots", () => {
    it("should generate 30-min slots within a time range", () => {
      const slots = generateTimeSlots("09:00", "12:00", 30, new Date("2026-03-02")); // Monday
      expect(slots).toHaveLength(6);
      expect(slots[0].startTime.getHours()).toBe(9);
      expect(slots[0].startTime.getMinutes()).toBe(0);
      expect(slots[5].startTime.getHours()).toBe(11);
      expect(slots[5].startTime.getMinutes()).toBe(30);
    });

    it("should generate 60-min slots within a time range", () => {
      const slots = generateTimeSlots("09:00", "12:00", 60, new Date("2026-03-02"));
      expect(slots).toHaveLength(3);
    });

    it("should not generate a slot that extends past the end time", () => {
      const slots = generateTimeSlots("09:00", "10:15", 60, new Date("2026-03-02"));
      // Only 09:00-10:00 fits, 10:00-11:00 would extend past 10:15
      expect(slots).toHaveLength(1);
    });

    it("should return empty array if range is too short for service", () => {
      const slots = generateTimeSlots("09:00", "09:20", 30, new Date("2026-03-02"));
      expect(slots).toHaveLength(0);
    });
  });

  describe("isSlotAvailable", () => {
    it("should return true when no conflicting bookings exist", () => {
      const slot: TimeSlot = {
        startTime: new Date("2026-03-02T10:00:00Z"),
        endTime: new Date("2026-03-02T10:30:00Z"),
      };
      const existingBookings: TimeSlot[] = [];
      expect(isSlotAvailable(slot, existingBookings)).toBe(true);
    });

    it("should return false when slot overlaps with an existing booking", () => {
      const slot: TimeSlot = {
        startTime: new Date("2026-03-02T10:00:00Z"),
        endTime: new Date("2026-03-02T10:30:00Z"),
      };
      const existingBookings: TimeSlot[] = [
        {
          startTime: new Date("2026-03-02T10:15:00Z"),
          endTime: new Date("2026-03-02T10:45:00Z"),
        },
      ];
      expect(isSlotAvailable(slot, existingBookings)).toBe(false);
    });

    it("should return true when slot is adjacent but not overlapping", () => {
      const slot: TimeSlot = {
        startTime: new Date("2026-03-02T10:00:00Z"),
        endTime: new Date("2026-03-02T10:30:00Z"),
      };
      const existingBookings: TimeSlot[] = [
        {
          startTime: new Date("2026-03-02T10:30:00Z"),
          endTime: new Date("2026-03-02T11:00:00Z"),
        },
      ];
      expect(isSlotAvailable(slot, existingBookings)).toBe(true);
    });

    it("should return false when slot is completely inside a booking", () => {
      const slot: TimeSlot = {
        startTime: new Date("2026-03-02T10:15:00Z"),
        endTime: new Date("2026-03-02T10:45:00Z"),
      };
      const existingBookings: TimeSlot[] = [
        {
          startTime: new Date("2026-03-02T10:00:00Z"),
          endTime: new Date("2026-03-02T11:00:00Z"),
        },
      ];
      expect(isSlotAvailable(slot, existingBookings)).toBe(false);
    });
  });

  describe("getAvailableSlots", () => {
    // Helper to create a date at local midnight for a specific date
    function localDate(year: number, month: number, day: number): Date {
      const d = new Date(year, month - 1, day);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    // Monday March 2, 2026 — dayOfWeek = 1
    const monday = localDate(2026, 3, 2);
    // Sunday March 1, 2026 — dayOfWeek = 0
    const sunday = localDate(2026, 3, 1);
    // Wednesday March 4, 2026 — dayOfWeek = 3
    const wednesday = localDate(2026, 3, 4);

    const schedule: AvailabilitySchedule[] = [
      { dayOfWeek: monday.getDay(), startTime: "09:00", endTime: "17:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Tuesday
      { dayOfWeek: sunday.getDay(), startTime: "09:00", endTime: "17:00", isAvailable: false },
    ];

    it("should return slots for an available day with no bookings", () => {
      const slots = getAvailableSlots(schedule, [], [], monday, 30);
      // 09:00-17:00 with 30-min slots = 16 slots
      expect(slots).toHaveLength(16);
    });

    it("should return empty for an unavailable day", () => {
      const slots = getAvailableSlots(schedule, [], [], sunday, 30);
      expect(slots).toHaveLength(0);
    });

    it("should return empty for a day not in schedule", () => {
      const slots = getAvailableSlots(schedule, [], [], wednesday, 30);
      expect(slots).toHaveLength(0);
    });

    it("should exclude slots that conflict with existing bookings", () => {
      const bookingStart = new Date(monday);
      bookingStart.setHours(10, 0, 0, 0);
      const bookingEnd = new Date(monday);
      bookingEnd.setHours(10, 30, 0, 0);
      const existingBookings: TimeSlot[] = [
        { startTime: bookingStart, endTime: bookingEnd },
      ];
      const slots = getAvailableSlots(schedule, [], existingBookings, monday, 30);
      expect(slots).toHaveLength(15); // 16 - 1 booked
    });

    it("should respect blocked override (day off)", () => {
      const overrides: AvailabilityOverrideData[] = [
        { date: monday, startTime: null, endTime: null, isBlocked: true },
      ];
      const slots = getAvailableSlots(schedule, overrides, [], monday, 30);
      expect(slots).toHaveLength(0);
    });

    it("should respect custom hours override", () => {
      const overrides: AvailabilityOverrideData[] = [
        { date: monday, startTime: "10:00", endTime: "12:00", isBlocked: false },
      ];
      const slots = getAvailableSlots(schedule, overrides, [], monday, 30);
      // 10:00-12:00 with 30-min slots = 4 slots
      expect(slots).toHaveLength(4);
    });
  });
});
