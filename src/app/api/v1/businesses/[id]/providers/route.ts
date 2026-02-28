import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/v1/businesses/:id/providers — List active providers (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    const serviceId = request.nextUrl.searchParams.get("serviceId");

    const providers = await prisma.serviceProvider.findMany({
      where: {
        businessId,
        isActive: true,
        ...(serviceId
          ? { providerServices: { some: { serviceId } } }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        providerServices: {
          include: {
            service: {
              select: { id: true, name: true, durationMinutes: true, price: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("List providers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
