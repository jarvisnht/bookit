import { enforceTenantScope, slugify } from "@/lib/utils/tenant";

describe("Tenant Utilities", () => {
  describe("enforceTenantScope", () => {
    it("should add businessId to a query filter", () => {
      const filter = enforceTenantScope({}, "biz-123");
      expect(filter).toEqual({ businessId: "biz-123" });
    });

    it("should preserve existing filter fields", () => {
      const filter = enforceTenantScope({ status: "ACTIVE" }, "biz-123");
      expect(filter).toEqual({ status: "ACTIVE", businessId: "biz-123" });
    });

    it("should override any existing businessId to prevent tenant escape", () => {
      const filter = enforceTenantScope({ businessId: "biz-hacker" }, "biz-123");
      expect(filter.businessId).toBe("biz-123");
    });

    it("should throw if businessId is empty", () => {
      expect(() => enforceTenantScope({}, "")).toThrow();
    });
  });

  describe("slugify", () => {
    it("should convert a name to a URL-friendly slug", () => {
      expect(slugify("Mark's Barbershop")).toBe("marks-barbershop");
    });

    it("should handle multiple spaces and special chars", () => {
      expect(slugify("  Hello   World!  ")).toBe("hello-world");
    });

    it("should lowercase everything", () => {
      expect(slugify("ALL CAPS")).toBe("all-caps");
    });
  });
});
