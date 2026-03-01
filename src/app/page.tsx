import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600">BookIt</h1>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-32">
        <div className="max-w-3xl">
          <h2 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Your AI-Powered
            <br />
            <span className="text-blue-600">Booking Assistant</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl">
            Let your customers book appointments through natural conversation.
            Via SMS, web chat, or your booking page — powered by AI.
          </p>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/marks-barbershop"
              className="px-8 py-4 bg-white text-gray-700 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-colors border border-gray-200"
            >
              See Demo
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            30 days free · No credit card required
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to manage bookings
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🤖"
              title="AI Booking Bot"
              description="Customers book through natural conversation via SMS or web chat. No apps to download."
            />
            <FeatureCard
              icon="📅"
              title="Smart Scheduling"
              description="Automatic availability management, conflict detection, and double-booking prevention."
            />
            <FeatureCard
              icon="📱"
              title="SMS & Web Chat"
              description="Meet your customers where they are. Text message support via Twilio integration."
            />
            <FeatureCard
              icon="👥"
              title="Multi-Provider"
              description="Manage multiple service providers with individual schedules and services."
            />
            <FeatureCard
              icon="🔔"
              title="Auto Reminders"
              description="Reduce no-shows with automatic appointment reminders via SMS."
            />
            <FeatureCard
              icon="📊"
              title="Dashboard"
              description="Clean dashboard for providers to manage bookings, services, and availability."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-lg font-semibold text-white mb-2">BookIt</p>
          <p className="text-sm">AI-powered booking for service businesses</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className="font-semibold text-gray-900 text-lg mb-2">{title}</h4>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}
