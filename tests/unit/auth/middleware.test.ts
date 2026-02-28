import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, getAuthPayload } from "@/lib/auth/middleware";
import { createAccessToken } from "@/lib/auth/jwt";

// Mock prisma
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    businessMembership: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from "@/lib/db";
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("Auth Middleware", () => {
  describe("getAuthPayload", () => {
    it("returns null when no auth header", () => {
      expect(getAuthPayload(makeRequest())).toBeNull();
    });

    it("returns null for invalid token", () => {
      expect(getAuthPayload(makeRequest("invalid-token"))).toBeNull();
    });

    it("returns payload for valid token", () => {
      const token = createAccessToken("user-123");
      const payload = getAuthPayload(makeRequest(token));
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe("user-123");
    });
  });

  describe("requireAuth", () => {
    it("returns 401 when unauthenticated", () => {
      const result = requireAuth(makeRequest());
      expect(result).toBeInstanceOf(NextResponse);
    });

    it("returns userId when authenticated", () => {
      const token = createAccessToken("user-456");
      const result = requireAuth(makeRequest(token));
      expect(result).toEqual({ userId: "user-456" });
    });
  });

  describe("requireRole", () => {
    it("returns 403 when user has no membership", async () => {
      (mockPrisma.businessMembership.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await requireRole("user-1", "biz-1", ["OWNER"]);
      expect(result).toBeInstanceOf(NextResponse);
    });

    it("returns 403 when user has wrong role", async () => {
      (mockPrisma.businessMembership.findUnique as jest.Mock).mockResolvedValue({
        role: "CUSTOMER",
      });
      const result = await requireRole("user-1", "biz-1", ["OWNER", "PROVIDER"]);
      expect(result).toBeInstanceOf(NextResponse);
    });

    it("returns role when user has correct role", async () => {
      (mockPrisma.businessMembership.findUnique as jest.Mock).mockResolvedValue({
        role: "OWNER",
      });
      const result = await requireRole("user-1", "biz-1", ["OWNER"]);
      expect(result).toEqual({ role: "OWNER" });
    });

    it("accepts any of the allowed roles", async () => {
      (mockPrisma.businessMembership.findUnique as jest.Mock).mockResolvedValue({
        role: "PROVIDER",
      });
      const result = await requireRole("user-1", "biz-1", ["OWNER", "PROVIDER"]);
      expect(result).toEqual({ role: "PROVIDER" });
    });
  });
});
