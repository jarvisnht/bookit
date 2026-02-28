import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, TokenPayload } from "./jwt";
import prisma from "@/lib/db";
import { MemberRole } from "@prisma/client";

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
}

/**
 * Extract and verify the access token from a request.
 * Returns the token payload or null.
 */
export function getAuthPayload(request: NextRequest): TokenPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export function requireAuth(
  request: NextRequest
): { userId: string } | NextResponse {
  const payload = getAuthPayload(request);
  if (!payload) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  return { userId: payload.userId };
}

/**
 * Require a specific role within a business.
 * Returns 403 if the user doesn't have the required role.
 */
export async function requireRole(
  userId: string,
  businessId: string,
  allowedRoles: MemberRole[]
): Promise<{ role: MemberRole } | NextResponse> {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: { userId, businessId },
    },
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return { role: membership.role };
}
