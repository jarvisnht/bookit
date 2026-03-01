import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";

interface Props {
  params: Promise<{ businessSlug: string }>;
}

export default async function BusinessPage({ params }: Props) {
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { category: "asc" },
      },
      serviceProviders: {
        where: { isActive: true },
      },
    },
  });

  if (!business) {
    notFound();
  }

  // Group services by category
  const servicesByCategory = business.services.reduce<Record<string, typeof business.services>>(
    (acc, service) => {
      const cat = service.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {business.name}
              </h1>
              {business.description && (
                <p className="text-gray-600 mt-1">{business.description}</p>
              )}
              {business.address && (
                <p className="text-gray-500 text-sm mt-1">📍 {business.address}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Services</h2>

        {Object.entries(servicesByCategory).map(([category, services]) => (
          <div key={category} className="mb-8">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              {category}
            </h3>
            <div className="space-y-3">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/${businessSlug}/book?serviceId=${service.id}`}
                  className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {service.name}
                      </h4>
                      {service.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {service.description}
                        </p>
                      )}
                      <p className="text-gray-500 text-sm mt-1">
                        ⏱ {service.durationMinutes} min
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900">
                        ${Number(service.price).toFixed(2)}
                      </span>
                      <p className="text-sm text-blue-600 mt-1">Book →</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Providers */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Our Team
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {business.serviceProviders.map((provider) => (
              <div
                key={provider.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-3 flex items-center justify-center text-blue-600 text-xl font-bold">
                  {provider.displayName.charAt(0)}
                </div>
                <h4 className="font-medium text-gray-900">
                  {provider.displayName}
                </h4>
                {provider.bio && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {provider.bio}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
