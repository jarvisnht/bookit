/**
 * Claude tool definitions for the booking bot.
 * These are passed to the Claude API as available tools.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: "search_services",
    description: "Search for available services at a business. Use when a customer asks about services, pricing, or what's available.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string", description: "The business ID" },
        query: { type: "string", description: "Optional search query to filter services by name" },
      },
      required: ["businessId"],
    },
  },
  {
    name: "get_providers",
    description: "Get list of service providers at a business. Optionally filter by service. Use when customer asks about who provides a service.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string", description: "The business ID" },
        serviceId: { type: "string", description: "Optional service ID to filter providers who offer that service" },
      },
      required: ["businessId"],
    },
  },
  {
    name: "search_availability",
    description: "Search for available time slots for a service. Use when customer wants to see available times.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string", description: "The business ID" },
        serviceId: { type: "string", description: "The service ID to check availability for" },
        providerId: { type: "string", description: "Optional specific provider ID" },
        date: { type: "string", description: "Start date in YYYY-MM-DD format" },
        days: { type: "number", description: "Number of days to check (default 7)" },
      },
      required: ["businessId", "serviceId", "date"],
    },
  },
  {
    name: "create_booking",
    description: "Create a new booking/appointment. Use after the customer has chosen a service, provider, and time slot.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string", description: "The business ID" },
        customerId: { type: "string", description: "The customer's user ID" },
        serviceId: { type: "string", description: "The service ID" },
        providerId: { type: "string", description: "The provider ID" },
        startTime: { type: "string", description: "Appointment start time in ISO 8601 format" },
      },
      required: ["businessId", "customerId", "serviceId", "providerId", "startTime"],
    },
  },
  {
    name: "cancel_booking",
    description: "Cancel an existing booking. Use when customer or provider wants to cancel an appointment.",
    input_schema: {
      type: "object" as const,
      properties: {
        bookingId: { type: "string", description: "The booking ID to cancel" },
        reason: { type: "string", description: "Optional cancellation reason" },
      },
      required: ["bookingId"],
    },
  },
  {
    name: "get_my_bookings",
    description: "Get the user's bookings. Use when customer asks about their appointments.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"], description: "Filter by status" },
        upcoming: { type: "boolean", description: "Only show upcoming bookings" },
      },
      required: [],
    },
  },
  {
    name: "update_profile",
    description: "Update the user's profile information. Use when customer wants to change their name, email, phone, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        fields: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            preferredContactMethod: { type: "string", enum: ["SMS", "EMAIL", "WEB_CHAT"] },
          },
        },
      },
      required: ["fields"],
    },
  },
  {
    name: "confirm_booking",
    description: "Confirm a pending booking. Only available to service providers.",
    input_schema: {
      type: "object" as const,
      properties: {
        bookingId: { type: "string", description: "The booking ID to confirm" },
      },
      required: ["bookingId"],
    },
  },
];
