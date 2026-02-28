import { PrismaClient } from "@prisma/client";
import { hashOtp } from "../src/lib/auth/otp";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilityOverride.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.providerService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceProvider.deleteMany();
  await prisma.businessMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  // ─── Users ─────────────────────────────────────────────
  const ownerUser = await prisma.user.create({
    data: {
      email: "owner@freshcuts.com",
      phone: "+15551000001",
      firstName: "Marcus",
      lastName: "Johnson",
      isVerified: true,
      preferredContactMethod: "EMAIL",
    },
  });

  const providerUser1 = await prisma.user.create({
    data: {
      email: "tony@freshcuts.com",
      phone: "+15551000002",
      firstName: "Tony",
      lastName: "Rivera",
      isVerified: true,
    },
  });

  const providerUser2 = await prisma.user.create({
    data: {
      email: "sarah@freshcuts.com",
      phone: "+15551000003",
      firstName: "Sarah",
      lastName: "Chen",
      isVerified: true,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      phone: "+15552000001",
      firstName: "Alex",
      lastName: "Thompson",
      isVerified: true,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: "jamie@example.com",
      phone: "+15552000002",
      firstName: "Jamie",
      lastName: "Williams",
      isVerified: true,
      preferredContactMethod: "EMAIL",
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      phone: "+15552000003",
      firstName: "Pat",
      lastName: "Davis",
      isVerified: false, // Unverified user for testing
    },
  });

  // Second business owner
  const owner2User = await prisma.user.create({
    data: {
      email: "lisa@zenspace.com",
      phone: "+15553000001",
      firstName: "Lisa",
      lastName: "Park",
      isVerified: true,
    },
  });

  // ─── Businesses ────────────────────────────────────────
  const freshCuts = await prisma.business.create({
    data: {
      name: "Fresh Cuts Barbershop",
      slug: "fresh-cuts",
      description: "Premium barbershop in downtown. Cuts, fades, and grooming since 2015.",
      timezone: "America/New_York",
      phone: "+15559001001",
      email: "info@freshcuts.com",
      address: "123 Main St, Brooklyn, NY 11201",
      subscriptionStatus: "ACTIVE",
      autoConfirmBookings: true,
      reminderLeadTimeMinutes: 60,
      trialEndsAt: new Date("2025-12-31"),
    },
  });

  const zenSpace = await prisma.business.create({
    data: {
      name: "Zen Space Wellness",
      slug: "zen-space",
      description: "Massage therapy and wellness center. Relax, restore, revive.",
      timezone: "America/Los_Angeles",
      phone: "+15559002001",
      email: "hello@zenspace.com",
      address: "456 Oak Ave, San Francisco, CA 94102",
      subscriptionStatus: "TRIAL",
      autoConfirmBookings: false, // Manual confirmation
      reminderLeadTimeMinutes: 120,
      trialEndsAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    },
  });

  // Suspended business for testing
  const suspendedBiz = await prisma.business.create({
    data: {
      name: "Old Timers Cuts",
      slug: "old-timers",
      description: "A suspended business for testing.",
      timezone: "America/Chicago",
      subscriptionStatus: "SUSPENDED",
    },
  });

  // ─── Business Memberships ─────────────────────────────
  await prisma.businessMembership.createMany({
    data: [
      // Fresh Cuts
      { userId: ownerUser.id, businessId: freshCuts.id, role: "OWNER" },
      { userId: providerUser1.id, businessId: freshCuts.id, role: "PROVIDER" },
      { userId: providerUser2.id, businessId: freshCuts.id, role: "PROVIDER" },
      { userId: customer1.id, businessId: freshCuts.id, role: "CUSTOMER" },
      { userId: customer2.id, businessId: freshCuts.id, role: "CUSTOMER" },
      // Zen Space
      { userId: owner2User.id, businessId: zenSpace.id, role: "OWNER" },
      { userId: customer1.id, businessId: zenSpace.id, role: "CUSTOMER" },
    ],
  });

  // ─── Service Providers ─────────────────────────────────
  const providerMarcus = await prisma.serviceProvider.create({
    data: {
      userId: ownerUser.id,
      businessId: freshCuts.id,
      displayName: "Marcus J.",
      bio: "Owner & Master Barber. 15+ years experience.",
      isActive: true,
    },
  });

  const providerTony = await prisma.serviceProvider.create({
    data: {
      userId: providerUser1.id,
      businessId: freshCuts.id,
      displayName: "Tony R.",
      bio: "Fade specialist. Clean lines guaranteed.",
      isActive: true,
    },
  });

  const providerSarah = await prisma.serviceProvider.create({
    data: {
      userId: providerUser2.id,
      businessId: freshCuts.id,
      displayName: "Sarah C.",
      bio: "Stylist & colorist.",
      isActive: false, // Inactive provider for testing
    },
  });

  const providerLisa = await prisma.serviceProvider.create({
    data: {
      userId: owner2User.id,
      businessId: zenSpace.id,
      displayName: "Lisa P.",
      bio: "Licensed massage therapist. Deep tissue & Swedish.",
      isActive: true,
    },
  });

  // ─── Services ──────────────────────────────────────────
  const classicCut = await prisma.service.create({
    data: {
      businessId: freshCuts.id,
      name: "Classic Cut",
      description: "Traditional men's haircut with hot towel finish.",
      durationMinutes: 30,
      price: 35.0,
      category: "Haircuts",
      isActive: true,
    },
  });

  const classicFade = await prisma.service.create({
    data: {
      businessId: freshCuts.id,
      name: "Classic Fade",
      description: "Sharp fade with blending. Includes lineup.",
      durationMinutes: 45,
      price: 45.0,
      category: "Haircuts",
      isActive: true,
    },
  });

  const beardTrim = await prisma.service.create({
    data: {
      businessId: freshCuts.id,
      name: "Beard Trim & Shape",
      description: "Precision beard trim with hot towel.",
      durationMinutes: 20,
      price: 20.0,
      category: "Grooming",
      isActive: true,
    },
  });

  const hotTowelShave = await prisma.service.create({
    data: {
      businessId: freshCuts.id,
      name: "Hot Towel Shave",
      description: "Classic straight razor shave with hot towel treatment.",
      durationMinutes: 30,
      price: 30.0,
      category: "Grooming",
      isActive: false, // Inactive service for testing
    },
  });

  const deepTissue = await prisma.service.create({
    data: {
      businessId: zenSpace.id,
      name: "Deep Tissue Massage",
      description: "60-minute deep tissue massage targeting problem areas.",
      durationMinutes: 60,
      price: 120.0,
      category: "Massage",
      isActive: true,
    },
  });

  const swedish = await prisma.service.create({
    data: {
      businessId: zenSpace.id,
      name: "Swedish Massage",
      description: "Relaxing full-body Swedish massage.",
      durationMinutes: 60,
      price: 100.0,
      category: "Massage",
      isActive: true,
    },
  });

  // ─── Provider-Service Mappings ─────────────────────────
  await prisma.providerService.createMany({
    data: [
      { serviceProviderId: providerMarcus.id, serviceId: classicCut.id },
      { serviceProviderId: providerMarcus.id, serviceId: classicFade.id },
      { serviceProviderId: providerMarcus.id, serviceId: beardTrim.id },
      { serviceProviderId: providerTony.id, serviceId: classicCut.id },
      { serviceProviderId: providerTony.id, serviceId: classicFade.id, customPrice: 50.0 },
      { serviceProviderId: providerTony.id, serviceId: beardTrim.id },
      { serviceProviderId: providerSarah.id, serviceId: classicCut.id },
      { serviceProviderId: providerLisa.id, serviceId: deepTissue.id },
      { serviceProviderId: providerLisa.id, serviceId: swedish.id },
    ],
  });

  // ─── Availability (recurring weekly) ──────────────────
  const weekdaySchedule = (providerId: string, businessId: string) =>
    [1, 2, 3, 4, 5].map((day) => ({
      serviceProviderId: providerId,
      businessId,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
    }));

  const saturdaySchedule = (providerId: string, businessId: string) => ({
    serviceProviderId: providerId,
    businessId,
    dayOfWeek: 6,
    startTime: "10:00",
    endTime: "14:00",
    isAvailable: true,
  });

  await prisma.availability.createMany({
    data: [
      ...weekdaySchedule(providerMarcus.id, freshCuts.id),
      saturdaySchedule(providerMarcus.id, freshCuts.id),
      ...weekdaySchedule(providerTony.id, freshCuts.id),
      // Lisa works Tue-Sat
      ...[2, 3, 4, 5].map((day) => ({
        serviceProviderId: providerLisa.id,
        businessId: zenSpace.id,
        dayOfWeek: day,
        startTime: "10:00",
        endTime: "18:00",
        isAvailable: true,
      })),
      {
        serviceProviderId: providerLisa.id,
        businessId: zenSpace.id,
        dayOfWeek: 6,
        startTime: "10:00",
        endTime: "15:00",
        isAvailable: true,
      },
    ],
  });

  // ─── Availability Overrides ────────────────────────────
  // Tony is off next Friday
  const nextFriday = new Date();
  nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));

  await prisma.availabilityOverride.create({
    data: {
      serviceProviderId: providerTony.id,
      businessId: freshCuts.id,
      date: nextFriday,
      isBlocked: true,
      reason: "Personal day",
    },
  });

  // Marcus has special Saturday hours next week
  const nextSaturday = new Date(nextFriday);
  nextSaturday.setDate(nextSaturday.getDate() + 1);

  await prisma.availabilityOverride.create({
    data: {
      serviceProviderId: providerMarcus.id,
      businessId: freshCuts.id,
      date: nextSaturday,
      startTime: "09:00",
      endTime: "16:00",
      isBlocked: false,
      reason: "Extended Saturday hours",
    },
  });

  // ─── Bookings ──────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const confirmedBooking = await prisma.booking.create({
    data: {
      businessId: freshCuts.id,
      customerId: customer1.id,
      serviceProviderId: providerMarcus.id,
      serviceId: classicFade.id,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 45 * 60 * 1000),
      status: "CONFIRMED",
      confirmationType: "AUTO",
      notes: "Regular client, skin fade",
    },
  });

  const pendingBooking = await prisma.booking.create({
    data: {
      businessId: zenSpace.id,
      customerId: customer1.id,
      serviceProviderId: providerLisa.id,
      serviceId: deepTissue.id,
      startTime: dayAfter,
      endTime: new Date(dayAfter.getTime() + 60 * 60 * 1000),
      status: "PENDING",
      confirmationType: "MANUAL",
      notes: "Lower back focus",
    },
  });

  // Past completed booking
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  lastWeek.setHours(11, 0, 0, 0);

  await prisma.booking.create({
    data: {
      businessId: freshCuts.id,
      customerId: customer2.id,
      serviceProviderId: providerTony.id,
      serviceId: classicCut.id,
      startTime: lastWeek,
      endTime: new Date(lastWeek.getTime() + 30 * 60 * 1000),
      status: "COMPLETED",
      confirmationType: "AUTO",
    },
  });

  // Cancelled booking
  await prisma.booking.create({
    data: {
      businessId: freshCuts.id,
      customerId: customer2.id,
      serviceProviderId: providerMarcus.id,
      serviceId: beardTrim.id,
      startTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000 + 20 * 60 * 1000),
      status: "CANCELLED",
      cancellationReason: "Schedule conflict",
      cancelledBy: "CUSTOMER",
    },
  });

  // ─── Conversations ────────────────────────────────────
  const conversation = await prisma.conversation.create({
    data: {
      userId: customer1.id,
      businessId: freshCuts.id,
      channel: "SMS",
      status: "ACTIVE",
      context: { lastIntent: "booking", businessSlug: "fresh-cuts" },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "USER",
        content: "I want to book a haircut",
        channel: "SMS",
      },
      {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: "I'd be happy to help you book a haircut at Fresh Cuts! We have Classic Cut ($35, 30 min) and Classic Fade ($45, 45 min). Which would you prefer?",
        channel: "SMS",
      },
      {
        conversationId: conversation.id,
        role: "USER",
        content: "Classic fade with Marcus",
        channel: "SMS",
      },
    ],
  });

  // ─── Notifications ────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: customer1.id,
        businessId: freshCuts.id,
        bookingId: confirmedBooking.id,
        type: "BOOKING_CONFIRMATION",
        channel: "SMS",
        content: `Your Classic Fade with Marcus J. is confirmed for ${tomorrow.toLocaleDateString()} at 10:00 AM.`,
        status: "SENT",
        sentAt: new Date(),
      },
      {
        userId: customer1.id,
        businessId: zenSpace.id,
        bookingId: pendingBooking.id,
        type: "BOOKING_CONFIRMATION",
        channel: "SMS",
        content: `Your Deep Tissue Massage booking is pending confirmation.`,
        status: "PENDING",
      },
    ],
  });

  console.log("✅ Seed data created:");
  console.log(`   - 7 users (2 owners, 2 providers, 3 customers)`);
  console.log(`   - 3 businesses (active, trial, suspended)`);
  console.log(`   - 7 memberships`);
  console.log(`   - 4 service providers (1 inactive)`);
  console.log(`   - 6 services (1 inactive) across 2 businesses`);
  console.log(`   - 9 provider-service mappings`);
  console.log(`   - 14 availability schedules`);
  console.log(`   - 2 availability overrides`);
  console.log(`   - 4 bookings (confirmed, pending, completed, cancelled)`);
  console.log(`   - 1 conversation with 3 messages`);
  console.log(`   - 2 notifications`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
