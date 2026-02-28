// Shared types for BookIt

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface AvailableSlot extends TimeSlot {
  serviceProviderId: string;
  providerName: string;
}

export interface AvailabilitySchedule {
  dayOfWeek: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isAvailable: boolean;
}

export interface AvailabilityOverrideData {
  date: Date;
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
}

export type ProviderSelectionStrategy = "first-available" | "round-robin" | "random";
