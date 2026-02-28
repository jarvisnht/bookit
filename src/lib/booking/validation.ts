import { TimeSlot } from "@/types";
import { isSlotAvailable } from "./availability";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a booking time is in the future and is a valid date.
 */
export function validateBookingTime(startTime: Date): ValidationResult {
  if (isNaN(startTime.getTime())) {
    return { valid: false, error: "Invalid date provided" };
  }

  if (startTime <= new Date()) {
    return { valid: false, error: "Cannot book in the past" };
  }

  return { valid: true };
}

/**
 * Validate that a proposed time slot doesn't conflict with existing bookings.
 */
export function validateNoDoubleBooking(
  slot: TimeSlot,
  existingBookings: TimeSlot[]
): ValidationResult {
  if (!isSlotAvailable(slot, existingBookings)) {
    return {
      valid: false,
      error: "Time slot has a conflict with an existing booking",
    };
  }

  return { valid: true };
}

/**
 * Validate that a provider offers the requested service.
 */
export function validateServiceProviderMatch(
  serviceId: string,
  providerServiceIds: string[]
): ValidationResult {
  if (!providerServiceIds.includes(serviceId)) {
    return {
      valid: false,
      error: "This provider does not offer the requested service",
    };
  }

  return { valid: true };
}
