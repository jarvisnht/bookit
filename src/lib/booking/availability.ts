import {
  TimeSlot,
  AvailabilitySchedule,
  AvailabilityOverrideData,
} from "@/types";

/**
 * Generate time slots of a given duration within a time range on a specific date.
 */
export function generateTimeSlots(
  startTimeStr: string,
  endTimeStr: string,
  durationMinutes: number,
  date: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = startTimeStr.split(":").map(Number);
  const [endH, endM] = endTimeStr.split(":").map(Number);

  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const rangeStartMinutes = startH * 60 + startM;
  const rangeEndMinutes = endH * 60 + endM;

  for (
    let minutes = rangeStartMinutes;
    minutes + durationMinutes <= rangeEndMinutes;
    minutes += durationMinutes
  ) {
    const slotStart = new Date(baseDate);
    slotStart.setMinutes(minutes);

    const slotEnd = new Date(baseDate);
    slotEnd.setMinutes(minutes + durationMinutes);

    slots.push({ startTime: slotStart, endTime: slotEnd });
  }

  return slots;
}

/**
 * Check if a time slot conflicts with any existing bookings.
 * Two slots overlap if one starts before the other ends and ends after the other starts.
 * Adjacent slots (end === start) do NOT overlap.
 */
export function isSlotAvailable(
  slot: TimeSlot,
  existingBookings: TimeSlot[]
): boolean {
  return !existingBookings.some(
    (booking) =>
      slot.startTime < booking.endTime && slot.endTime > booking.startTime
  );
}

/**
 * Get all available time slots for a provider on a given date.
 * Considers: recurring schedule, overrides (blocks/custom hours), and existing bookings.
 */
export function getAvailableSlots(
  schedule: AvailabilitySchedule[],
  overrides: AvailabilityOverrideData[],
  existingBookings: TimeSlot[],
  date: Date,
  serviceDurationMinutes: number
): TimeSlot[] {
  const dayOfWeek = date.getDay();

  // Check for override on this date
  const override = overrides.find((o) => {
    const overrideDate = new Date(o.date);
    return (
      overrideDate.getFullYear() === date.getFullYear() &&
      overrideDate.getMonth() === date.getMonth() &&
      overrideDate.getDate() === date.getDate()
    );
  });

  // If blocked override, no slots
  if (override?.isBlocked) {
    return [];
  }

  // If custom hours override, use those instead of schedule
  if (override && !override.isBlocked && override.startTime && override.endTime) {
    const allSlots = generateTimeSlots(
      override.startTime,
      override.endTime,
      serviceDurationMinutes,
      date
    );
    return allSlots.filter((slot) => isSlotAvailable(slot, existingBookings));
  }

  // Use recurring schedule
  const daySchedule = schedule.find(
    (s) => s.dayOfWeek === dayOfWeek && s.isAvailable
  );

  if (!daySchedule) {
    return [];
  }

  const allSlots = generateTimeSlots(
    daySchedule.startTime,
    daySchedule.endTime,
    serviceDurationMinutes,
    date
  );

  return allSlots.filter((slot) => isSlotAvailable(slot, existingBookings));
}
