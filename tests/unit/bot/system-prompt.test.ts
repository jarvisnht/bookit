import { buildSystemPrompt } from "@/lib/bot/system-prompt";

describe("System Prompt Builder", () => {
  const business = {
    name: "Fresh Cuts",
    description: "Premium barbershop",
    timezone: "America/New_York",
    autoConfirmBookings: true,
    reminderLeadTimeMinutes: 60,
    services: [
      { id: "s1", name: "Classic Cut", durationMinutes: 30, price: 35, category: "Haircuts" },
      { id: "s2", name: "Beard Trim", durationMinutes: 20, price: 20, category: "Grooming" },
    ],
    providers: [
      { id: "p1", displayName: "Marcus J.", services: ["Classic Cut", "Beard Trim"] },
    ],
  };

  const user = {
    id: "user-1",
    firstName: "Alex",
    lastName: "Thompson",
    role: "CUSTOMER",
    upcomingBookings: 2,
  };

  it("includes business name and description", () => {
    const prompt = buildSystemPrompt(business, user, "WEB_CHAT");
    expect(prompt).toContain("Fresh Cuts");
    expect(prompt).toContain("Premium barbershop");
  });

  it("includes all services with pricing", () => {
    const prompt = buildSystemPrompt(business, user, "WEB_CHAT");
    expect(prompt).toContain("Classic Cut");
    expect(prompt).toContain("$35");
    expect(prompt).toContain("30 min");
    expect(prompt).toContain("Beard Trim");
  });

  it("includes provider info", () => {
    const prompt = buildSystemPrompt(business, user, "WEB_CHAT");
    expect(prompt).toContain("Marcus J.");
  });

  it("includes user context", () => {
    const prompt = buildSystemPrompt(business, user, "WEB_CHAT");
    expect(prompt).toContain("Alex Thompson");
    expect(prompt).toContain("CUSTOMER");
    expect(prompt).toContain("Upcoming bookings: 2");
  });

  it("uses SMS-specific instructions for SMS channel", () => {
    const prompt = buildSystemPrompt(business, user, "SMS");
    expect(prompt).toContain("SMS");
    expect(prompt).toContain("concise");
  });

  it("uses web chat instructions for WEB_CHAT channel", () => {
    const prompt = buildSystemPrompt(business, user, "WEB_CHAT");
    expect(prompt).toContain("Web Chat");
  });

  it("includes provider/owner role instructions", () => {
    const providerUser = { ...user, role: "PROVIDER" };
    const prompt = buildSystemPrompt(business, providerUser, "WEB_CHAT");
    expect(prompt).toContain("PROVIDER");
    expect(prompt).toContain("Confirm pending bookings");
  });

  it("includes auto-confirm policy", () => {
    const prompt = buildSystemPrompt(business, user, "WEB_CHAT");
    expect(prompt).toContain("Auto-confirmed");
  });

  it("includes manual confirm policy", () => {
    const manualBiz = { ...business, autoConfirmBookings: false };
    const prompt = buildSystemPrompt(manualBiz, user, "WEB_CHAT");
    expect(prompt).toContain("manual confirmation");
  });

  it("handles user without name gracefully", () => {
    const anonUser = { ...user, firstName: null, lastName: null };
    const prompt = buildSystemPrompt(business, anonUser, "WEB_CHAT");
    expect(prompt).toContain("there");
  });
});
