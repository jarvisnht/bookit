import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Book<span className="text-blue-600">It</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The AI-powered booking platform for service businesses. 
            Let your customers book appointments through conversation.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/marks-barbershop"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition border border-blue-200"
            >
              See Demo →
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold text-lg mb-2">AI-Powered Booking</h3>
            <p className="text-gray-600 text-sm">
              Customers book through natural conversation via SMS or web chat. 
              No more phone tag or complicated forms.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-semibold text-lg mb-2">Smart Scheduling</h3>
            <p className="text-gray-600 text-sm">
              Automatic availability management, conflict detection, 
              and reminders. Never double-book again.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold text-lg mb-2">SMS & Web Chat</h3>
            <p className="text-gray-600 text-sm">
              Reach customers where they are. Text message booking 
              or embedded chat widget on your website.
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple Pricing
          </h2>
          <p className="text-gray-600 mb-8">
            30 days free. No credit card required.
          </p>
          <div className="bg-white rounded-xl p-8 shadow-sm max-w-sm mx-auto border border-gray-100">
            <div className="text-4xl font-bold text-gray-900">
              Coming Soon
            </div>
            <p className="text-gray-500 mt-2">
              Pricing will be announced soon
            </p>
            <Link
              href="/signup"
              className="block mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 text-center text-gray-500 text-sm">
          <p>© 2026 BookIt. Built with ❤️</p>
        </footer>
      </div>
    </div>
  );
}
