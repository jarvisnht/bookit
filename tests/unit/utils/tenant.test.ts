import { enforceTenantScope, slugify } from "@/lib/utils/tenant";

describe("Tenant Utilities", () => {
  describe("enforceTenantScope", () => {
    it("injects businessId into filter", () => {
      const result = enforceTenantScope({ status: "ACTIVE" }, "biz-123");
      expect(result).toEqual({ status: "ACTIVE", businessId: "biz-123" });
    });

    it("overwrites existing businessId to prevent tenant escape", () => {
      const result = enforceTenantScope({ businessId: "evil-biz" } as Record<string, unknown>, "biz-123");
      expect(result.businessId).toBe("biz-123");
    });

    it("throws if businessId is empty", () => {
      expect(() => enforceTenantScope({}, "")).toThrow("businessId is required");
    });

    it("preserves all original filter properties", () => {
      const filter = { status: "PENDING", customerId: "user-1", startTime: new Date() };
      const result = enforceTenantScope(filter, "biz-123");
      expect(result.status).toBe("PENDING");
      expect(result.customerId).toBe("user-1");
      expect(result.startTime).toBe(filter.startTime);
      expect(result.businessId).toBe("biz-123");
    });
  });

  describe("slugify", () => {
    it("converts name to lowercase slug", () => {
      expect(slugify("Fresh Cuts Barbershop")).toBe("fresh-cuts-barbershop");
    });

    it("removes special characters", () => {
      expect(slugify("Tony's Place!")).toBe("tonys-place");
    });

    it("handles multiple spaces and dashes", () => {
      expect(slugify("  Zen   Space  ")).toBe("zen-space");
    });

    it("handles underscores", () => {
      expect(slugify("my_cool_business")).toBe("my-cool-business");
    });

    it("returns empty string for empty input", () => {
      expect(slugify("")).toBe("");
    });
  });
});
