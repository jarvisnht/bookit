/**
 * Enforce tenant scoping on any query filter object.
 * Always injects the correct businessId, preventing tenant escape.
 */
export function enforceTenantScope<T extends Record<string, unknown>>(
  filter: T,
  businessId: string
): T & { businessId: string } {
  if (!businessId) {
    throw new Error("businessId is required for tenant-scoped queries");
  }
  return { ...filter, businessId };
}

/**
 * Convert a business name to a URL-friendly slug.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
