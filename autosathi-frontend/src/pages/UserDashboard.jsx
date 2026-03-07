import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { calcFare, bookRide } from "../utils/api";
import { Spinner, Toast, StatCard } from "../components/UI";

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ pickupLocation: "", dropLocation: "", distanceKm: "" });
  const [fareData, setFareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState(null);
  const [step, setStep] = useState("input"); // input | fare | booked

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckFare = async (e) => {
    e.preventDefault();
    if (!form.pickupLocation || !form.dropLocation || !form.distanceKm) {
      showToast("Please fill all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await calcFare(form);
      setFareData(res.data);
      setStep("fare");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to calculate fare", "error");
    }
    setLoading(false);
  };

  const handleBookRide = async () => {
    setBooking(true);
    try {
      const res = await bookRide(form);
      showToast("🎉 Ride booked! Searching for driver...", "success");
      setStep("booked");
      setTimeout(() => navigate(`/ride/${res.data.ride._id}`), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || "Booking failed", "error");
    }
    setBooking(false);
  };

  const resetForm = () => {
    setForm({ pickupLocation: "", dropLocation: "", distanceKm: "" });
    setFareData(null);
    setStep("input");
  };

  // Quick location suggestions
  const popularPlaces = [
    "Railway Station", "Bus Stand", "Airport", "City Center",
    "Hospital", "Market Area", "University", "Mall"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Top banner */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-3xl">
                Namaste, <span className="text-auto-yellow">{user?.name?.split(" ")[0]}</span>! 👋
              </h1>
              <p className="text-gray-400 mt-1">Where are you going today?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate("/history")}
                className="border border-white/30 text-white px-4 py-2 rounded-xl font-semibold hover:border-auto-yellow hover:text-auto-yellow transition-all text-sm">
                📜 My Rides
              </button>
            </div>
          </div>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">

          {/* ── Booking Form ── */}
          <div className="md:col-span-2">
            {step === "input" && (
              <div className="card animate-slide-up">
                <h2 className="section-title mb-6">🛺 Book Auto Rickshaw</h2>

                <form onSubmit={handleCheckFare} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">
                      📍 Pickup Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dadar, Mumbai"
                      className="input-field"
                      value={form.pickupLocation}
                      onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
                    />
                    {/* Quick select */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {popularPlaces.slice(0, 4).map((p) => (
                        <button key={p} type="button"
                          onClick={() => setForm({ ...form, pickupLocation: p })}
                          className="text-xs bg-gray-100 hover:bg-yellow-100 hover:text-auto-yellow px-3 py-1 rounded-full transition-all">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <div className="w-8 h-8 bg-auto-yellow rounded-full flex items-center justify-center text-auto-dark font-bold text-sm">↕</div>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">
                      🏁 Drop Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Andheri, Mumbai"
                      className="input-field"
                      value={form.dropLocation}
                      onChange={(e) => setForm({ ...form, dropLocation: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {popularPlaces.slice(4).map((p) => (
                        <button key={p} type="button"
                          onClick={() => setForm({ ...form, dropLocation: p })}
                          className="text-xs bg-gray-100 hover:bg-yellow-100 hover:text-auto-yellow px-3 py-1 rounded-full transition-all">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">
                      📏 Distance (in km)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      min="0.1" step="0.1"
                      className="input-field"
                      value={form.distanceKm}
                      onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      💡 Tip: Use Google Maps to find approximate distance
                    </p>
                  </div>

                  <button type="submit" disabled={loading}
                    className="btn-primary w-full text-lg py-4 disabled:opacity-60">
                    {loading ? <Spinner text="" /> : "💰 Check Fare"}
                  </button>
                </form>
              </div>
            )}

            {/* ── Fare Result ── */}
            {step === "fare" && fareData && (
              <div className="card animate-slide-up">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">💰</span>
                  </div>
                  <h2 className="section-title">Your Estimated Fare</h2>
                </div>

                {/* Fare breakdown */}
                <div className="bg-gradient-to-r from-auto-dark to-auto-card text-white rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">TOTAL FARE</p>
                      <p className="font-display font-bold text-5xl text-auto-yellow">
                        ₹{fareData.totalFare}
                      </p>
                    </div>
                    <span className="text-5xl">🛺</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Fare</span>
                      <span>₹{fareData.baseFare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Distance</span>
                      <span>{fareData.distanceKm} km × ₹{fareData.ratePerKm}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-white/10 pt-2">
                      <span>Total</span>
                      <span className="text-auto-yellow">₹{fareData.totalFare}</span>
                    </div>
                  </div>
                </div>

                {/* Route display */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 font-bold mb-1">FROM</p>
                    <p className="font-bold text-sm">{fareData.pickupLocation}</p>
                  </div>
                  <div className="text-2xl text-auto-yellow">→</div>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 font-bold mb-1">TO</p>
                    <p className="font-bold text-sm">{fareData.dropLocation}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={resetForm}
                    className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:border-gray-400 transition-all">
                    ← Change
                  </button>
                  <button onClick={handleBookRide} disabled={booking}
                    className="flex-2 btn-primary flex-1 py-3 text-lg disabled:opacity-60">
                    {booking ? "⏳ Booking..." : "🛺 Book Now!"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Booked State ── */}
            {step === "booked" && (
              <div className="card text-center animate-slide-up">
                <span className="text-6xl block mb-4">✅</span>
                <h2 className="section-title mb-2">Ride Booked!</h2>
                <p className="text-gray-500">Searching for nearby driver...</p>
                <div className="mt-4 flex justify-center">
                  <div className="w-10 h-10 border-4 border-auto-yellow border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar Info ── */}
          <div className="space-y-4">
            {/* Fare info card */}
            <div className="card bg-auto-dark text-white">
              <h3 className="font-display font-bold mb-4 text-auto-yellow">💰 Fare Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Base Fare</span>
                  <span className="font-bold">₹20</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Per KM</span>
                  <span className="font-bold">₹12</span>
                </div>
                <div className="bg-auto-yellow/20 rounded-lg p-3 text-xs text-gray-300">
                  <p className="font-bold text-auto-yellow mb-1">Example</p>
                  5 km → ₹20 + (5 × ₹12) = <span className="font-bold text-white">₹80</span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="card">
              <h3 className="font-display font-bold mb-4 text-auto-dark">🛺 Quick Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-auto-yellow mt-0.5">•</span>
                  Be ready at pickup location before driver arrives
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-auto-yellow mt-0.5">•</span>
                  Carry exact change for faster payment
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-auto-yellow mt-0.5">•</span>
                  Rate your driver after each trip
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-auto-yellow mt-0.5">•</span>
                  Cancel only if absolutely necessary
                </li>
              </ul>
            </div>

            <button onClick={() => navigate("/history")}
              className="btn-secondary w-full text-center py-3">
              📜 View Ride History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
