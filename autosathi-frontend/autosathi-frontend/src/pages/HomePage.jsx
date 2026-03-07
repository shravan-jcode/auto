import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  const features = [
    { icon: "💰", title: "Instant Fare Estimate", desc: "Know your fare before you book. No surprises." },
    { icon: "🚕", title: "Nearby Auto Drivers", desc: "Find available auto drivers near you instantly." },
    { icon: "📍", title: "Live Ride Tracking", desc: "Track your auto in real-time from pickup to drop." },
    { icon: "⭐", title: "Rate Your Driver", desc: "Help keep the community safe by rating your ride." },
    { icon: "📜", title: "Booking History", desc: "View all your past rides anytime, anywhere." },
    { icon: "🛡️", title: "Safe & Reliable", desc: "Verified drivers and secure platform for your safety." },
  ];

  const steps = [
    { step: "01", icon: "📱", title: "Sign Up", desc: "Create your account in 30 seconds" },
    { step: "02", icon: "📍", title: "Enter Locations", desc: "Set pickup and destination" },
    { step: "03", icon: "💰", title: "Check Fare", desc: "See the price before you confirm" },
    { step: "04", icon: "🛺", title: "Ride!", desc: "Auto arrives and you're on your way" },
  ];

  return (
    <div className="min-h-screen">

      {/* ── Hero Section ── */}
      <section className="bg-auto-dark text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #FFB800 0%, transparent 50%), radial-gradient(circle at 80% 20%, #FF7C0A 0%, transparent 40%)"
          }} />

        <div className="max-w-6xl mx-auto px-4 py-20 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-auto-yellow/20 border border-auto-yellow/30 text-auto-yellow px-4 py-2 rounded-full text-sm font-bold mb-6">
                🛺 India's Smart Auto Booking
              </div>
              <h1 className="font-display font-bold text-5xl md:text-6xl leading-tight mb-6">
                Book Your <span className="text-auto-yellow">Auto Rickshaw</span> in Seconds
              </h1>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                AutoSathi connects you with trusted auto drivers near you. 
                Fast booking, fair fares, and safe rides — every time.
              </p>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <Link to={user.role === "driver" ? "/driver" : user.role === "admin" ? "/admin" : "/dashboard"}
                    className="btn-primary text-lg px-8 py-4">
                    Go to Dashboard →
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn-primary text-lg px-8 py-4">
                      Book Now 🛺
                    </Link>
                    <Link to="/login"
                      className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold hover:border-auto-yellow hover:text-auto-yellow transition-all">
                      Login
                    </Link>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-10 pt-10 border-t border-white/10">
                {[
                  { num: "5000+", label: "Happy Riders" },
                  { num: "500+", label: "Drivers" },
                  { num: "10K+", label: "Rides Done" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-display font-bold text-2xl text-auto-yellow">{s.num}</p>
                    <p className="text-gray-400 text-sm">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero illustration */}
            <div className="hidden md:flex flex-col items-center justify-center animate-fade-in">
              <div className="relative">
                <div className="w-72 h-72 bg-auto-yellow/20 rounded-full flex items-center justify-center">
                  <div className="w-56 h-56 bg-auto-yellow/30 rounded-full flex items-center justify-center">
                    <span className="text-9xl animate-bounce-slow">🛺</span>
                  </div>
                </div>
                {/* Floating cards */}
                <div className="absolute -top-4 -right-8 bg-white text-auto-dark rounded-2xl p-3 shadow-xl animate-pulse-slow">
                  <p className="text-xs font-bold text-gray-500">ESTIMATED FARE</p>
                  <p className="font-display font-bold text-xl text-auto-yellow">₹80</p>
                </div>
                <div className="absolute -bottom-4 -left-8 bg-green-500 text-white rounded-2xl p-3 shadow-xl">
                  <p className="text-xs font-bold">Driver Found!</p>
                  <p className="font-bold">⭐ 4.8 Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated road */}
        <div className="road-line mt-4" />
      </section>

      {/* ── How it Works ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-4xl text-auto-dark mb-3">
              How <span className="text-auto-yellow">AutoSathi</span> Works
            </h2>
            <p className="text-gray-500 text-lg">Book your ride in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="text-center group">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 bg-auto-dark rounded-2xl flex items-center justify-center mx-auto group-hover:bg-auto-yellow transition-all duration-300">
                    <span className="text-3xl">{s.icon}</span>
                  </div>
                  <span className="absolute -top-2 -right-2 bg-auto-yellow text-auto-dark text-xs font-display font-bold w-7 h-7 rounded-full flex items-center justify-center">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-auto-dark mb-1">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute right-0 top-10 text-gray-300 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-4xl text-auto-dark mb-3">
              Why Choose <span className="text-auto-yellow">AutoSathi?</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <span className="text-4xl mb-4 block">{f.icon}</span>
                <h3 className="font-display font-bold text-lg text-auto-dark mb-2 group-hover:text-auto-yellow transition-colors">
                  {f.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-auto-dark text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-6xl block mb-6">🛺</span>
          <h2 className="font-display font-bold text-4xl mb-4">
            Ready for Your Next Ride?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Join thousands of happy riders using AutoSathi every day.
          </p>
          {!user && (
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-4">
                Register as Rider 🧑
              </Link>
              <Link to="/register?role=driver"
                className="border-2 border-auto-yellow text-auto-yellow px-8 py-4 rounded-xl font-bold hover:bg-auto-yellow hover:text-auto-dark transition-all">
                Register as Driver 🚕
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🛺</span>
            <span className="font-display font-bold text-white">Auto<span className="text-auto-yellow">Sathi</span></span>
          </div>
          <p className="text-sm">© 2024 AutoSathi · Smart Auto Rickshaw Booking System</p>
          <p className="text-xs mt-2 text-gray-600">Built with ❤️ for India</p>
        </div>
      </footer>
    </div>
  );
}
