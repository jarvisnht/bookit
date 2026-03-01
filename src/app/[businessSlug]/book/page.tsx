"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
}

interface Provider {
  id: string;
  displayName: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  serviceProviderId: string;
  providerName: string;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("serviceId");

  const [businessSlug, setBusinessSlug] = useState("");
  const [step, setStep] = useState<"provider" | "date" | "time" | "confirm" | "done">("provider");
  const [service, setService] = useState<Service | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Record<string, TimeSlot[]>>({});
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((p) => setBusinessSlug(p.businessSlug));
  }, [params]);

  useEffect(() => {
    if (!businessSlug) return;
    // Fetch business info to get service details and providers
    fetch(`/api/v1/businesses/${businessSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.business) {
          setProviders(data.business.serviceProviders);
          if (serviceId) {
            const svc = data.business.services.find((s: Service) => s.id === serviceId);
            if (svc) setService(svc);
          }
        }
      });
  }, [businessSlug, serviceId]);

  const fetchAvailability = async (providerId: string | null, date: string) => {
    if (!service || !businessSlug) return;
    setLoading(true);
    try {
      const url = new URL(`/api/v1/businesses/${businessSlug}/availability`, window.location.origin);
      url.searchParams.set("serviceId", service.id);
      if (providerId) url.searchParams.set("providerId", providerId);
      url.searchParams.set("date", date);
      url.searchParams.set("days", "1");

      const res = await fetch(url);
      const data = await res.json();
      setSlots(data.availability || {});
    } catch {
      setError("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (providerId: string | null) => {
    setSelectedProvider(providerId);
    setStep("date");
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    fetchAvailability(selectedProvider, date);
    setStep("time");
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !service) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Please log in to book an appointment");
        return;
      }

      const res = await fetch(`/api/v1/businesses/${businessSlug}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: service.id,
          serviceProviderId: selectedSlot.serviceProviderId,
          startTime: selectedSlot.startTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Booking failed");
      }

      setStep("done");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate next 14 days for date picker
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading service...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Service info */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6 border border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">{service.name}</h1>
          <p className="text-gray-600 text-sm">{service.description}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>⏱ {service.durationMinutes} min</span>
            <span>${Number(service.price).toFixed(2)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {["provider", "date", "time", "confirm"].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded ${
                ["provider", "date", "time", "confirm"].indexOf(s) <=
                ["provider", "date", "time", "confirm"].indexOf(step)
                  ? "bg-blue-600"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Step: Choose Provider */}
        {step === "provider" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Choose a provider</h2>
            <button
              onClick={() => handleProviderSelect(null)}
              className="w-full text-left bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-3 hover:border-blue-300 transition"
            >
              <span className="font-medium">Anyone available</span>
              <span className="text-gray-500 text-sm block">
                First available provider
              </span>
            </button>
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id)}
                className="w-full text-left bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-3 hover:border-blue-300 transition"
              >
                <span className="font-medium">{provider.displayName}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step: Choose Date */}
        {step === "date" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Pick a date</h2>
            <div className="grid grid-cols-3 gap-2">
              {dates.map((date) => {
                const d = new Date(date + "T12:00:00");
                return (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:border-blue-300 transition text-center"
                  >
                    <div className="text-xs text-gray-500">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="font-medium">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep("provider")}
              className="mt-4 text-blue-600 text-sm"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step: Choose Time */}
        {step === "time" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Available times for{" "}
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <>
                {Object.values(slots).flat().length === 0 ? (
                  <p className="text-gray-500">No available times for this date.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {Object.values(slots)
                      .flat()
                      .map((slot, i) => {
                        const time = new Date(slot.startTime);
                        return (
                          <button
                            key={i}
                            onClick={() => handleSlotSelect(slot)}
                            className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:border-blue-300 transition text-center"
                          >
                            <div className="font-medium">
                              {time.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {slot.providerName}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => setStep("date")}
              className="mt-4 text-blue-600 text-sm"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && selectedSlot && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Confirm Booking</h2>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 space-y-2">
              <p>
                <strong>Service:</strong> {service.name}
              </p>
              <p>
                <strong>Provider:</strong> {selectedSlot.providerName}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(selectedSlot.startTime).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p>
                <strong>Time:</strong>{" "}
                {new Date(selectedSlot.startTime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p>
                <strong>Duration:</strong> {service.durationMinutes} min
              </p>
              <p>
                <strong>Price:</strong> ${Number(service.price).toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </button>
            <button
              onClick={() => setStep("time")}
              className="w-full mt-2 text-blue-600 text-sm"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h2>
            <p className="text-gray-600">
              You'll receive a confirmation and reminder before your appointment.
            </p>
            <a
              href={`/${businessSlug}`}
              className="inline-block mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Back to {businessSlug}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
