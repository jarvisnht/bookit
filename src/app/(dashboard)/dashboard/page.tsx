"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardData {
  bookingsToday: number;
  bookingsThisWeek: number;
  pendingBookings: number;
  upcomingBookings: Array<{
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    service: { name: string };
    serviceProvider: { displayName: string };
    customer?: { firstName: string; lastName: string };
    business: { name: string; timezone: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetch("/api/v1/bookings?upcoming=true", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        const bookings = result.bookings || [];
        const now = new Date();
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);

        setData({
          bookingsToday: bookings.filter(
            (b: any) => new Date(b.startTime) <= todayEnd
          ).length,
          bookingsThisWeek: bookings.filter(
            (b: any) => new Date(b.startTime) <= weekEnd
          ).length,
          pendingBookings: bookings.filter(
            (b: any) => b.status === "PENDING"
          ).length,
          upcomingBookings: bookings.slice(0, 5),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">BookIt Dashboard</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-blue-600 font-medium">Overview</Link>
            <Link href="/dashboard/bookings" className="text-gray-500 hover:text-gray-900">Bookings</Link>
            <Link href="/dashboard/services" className="text-gray-500 hover:text-gray-900">Services</Link>
            <Link href="/dashboard/availability" className="text-gray-500 hover:text-gray-900">Availability</Link>
            <Link href="/dashboard/settings" className="text-gray-500 hover:text-gray-900">Settings</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <StatCard label="Today" value={data?.bookingsToday || 0} icon="📅" />
          <StatCard label="This Week" value={data?.bookingsThisWeek || 0} icon="📊" />
          <StatCard label="Pending" value={data?.pendingBookings || 0} icon="⏳" />
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Upcoming Bookings</h2>
          </div>
          {data?.upcomingBookings.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No upcoming bookings
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data?.upcomingBookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{booking.service.name}</p>
                    <p className="text-sm text-gray-500">
                      with {booking.serviceProvider.displayName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(booking.startTime).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(booking.startTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : booking.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
