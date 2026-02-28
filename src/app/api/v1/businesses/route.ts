import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";
import { slugify } from "@/lib/utils/tenant";

/**
 * POST /api/v1/businesses — Create a new business (owner registration)
 */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, description, timezone, phone, email, address } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = slugify(name);
    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create business + owner membership in a transaction
    const business = await prisma.$transaction(async (tx) => {
      const biz = await tx.business.create({
        data: {
          name,
          slug,
          description,
          timezone: timezone || "America/New_York",
          phone,
          email,
          address,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Make the creator the owner
      await tx.businessMembership.create({
        data: {
          userId: auth.userId,
          businessId: biz.id,
          role: "OWNER",
        },
      });

      return biz;
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error("Create business error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
