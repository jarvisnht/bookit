/**
 * System prompt builder for the booking bot.
 * Dynamically generates context based on business + user.
 */

interface BusinessContext {
  name: string;
  description?: string | null;
  timezone: string;
  autoConfirmBookings: boolean;
  reminderLeadTimeMinutes: number;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
    category?: string | null;
  }>;
  providers: Array<{
    id: string;
    displayName: string;
    services: string[];
  }>;
}

interface UserContext {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  upcomingBookings?: number;
}

type Channel = "SMS" | "WEB_CHAT";

export function buildSystemPrompt(
  business: BusinessContext,
  user: UserContext,
  channel: Channel
): string {
  const serviceList = business.services
    .map((s) => `  - ${s.name} (${s.durationMinutes} min, $${s.price}${s.category ? `, ${s.category}` : ""}) [ID: ${s.id}]`)
    .join("\n");

  const providerList = business.providers
    .map((p) => `  - ${p.displayName} — offers: ${p.services.join(", ")} [ID: ${p.id}]`)
    .join("\n");

  const userName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : "there";

  const roleInstructions = user.role === "PROVIDER" || user.role === "OWNER"
    ? `\nThis user is a ${user.role}. They can:
- Confirm pending bookings (use confirm_booking)
- View and manage their schedule
- Create services and manage availability`
    : "";

  const channelInstructions = channel === "SMS"
    ? `\nChannel: SMS — Keep responses concise (under 160 chars when possible). No markdown formatting. Use plain text.`
    : `\nChannel: Web Chat — You can use richer formatting. Keep responses friendly and conversational.`;

  return `You are the booking assistant for ${business.name}.
${business.description ? `About: ${business.description}` : ""}
Timezone: ${business.timezone}
Booking policy: ${business.autoConfirmBookings ? "Auto-confirmed" : "Requires manual confirmation from provider"}
Reminder: ${business.reminderLeadTimeMinutes} minutes before appointment

Available services:
${serviceList}

Service providers:
${providerList}

Current user: ${userName} (ID: ${user.id}, Role: ${user.role})
${user.upcomingBookings !== undefined ? `Upcoming bookings: ${user.upcomingBookings}` : ""}
${roleInstructions}
${channelInstructions}

Instructions:
- Be friendly, professional, and helpful
- Always use the tools to look up real data — never make up availability or prices
- When booking, always confirm the details before creating the booking
- Use the business timezone for all displayed times
- If a customer asks for something outside your tools, let them know what you can help with
- Today's date is ${new Date().toISOString().split("T")[0]}
- For date references like "tomorrow" or "next Thursday", calculate the actual date
- Always pass the businessId (${business.name}'s ID) when calling tools that require it`;
}
