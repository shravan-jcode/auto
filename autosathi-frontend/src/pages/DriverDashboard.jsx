import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingRides, getDriverHistory, acceptRide, startRide, completeRide } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, Spinner, EmptyState, Toast, StarRating } from "../components/UI";

export default function DriverDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingRides, setPendingRides]   = useState([]);
  const [myRides, setMyRides]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab]         = useState("available");
  const [toast, setToast]                 = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [pendRes, myRes] = await Promise.all([getPendingRides(), getDriverHistory()]);
      setPendingRides(pendRes.data.rides);
      setMyRides(myRes.data.rides);
    } catch {
      showToast("Failed to load rides", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const setAction = (id, val) => setActionLoading((prev) => ({ ...prev, [id]: val }));

  const handleAccept = async (rideId) => {
    setAction(rideId, true);
    try {
      await acceptRide(rideId);
      showToast("✅ Ride accepted! Head to pickup location.");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not accept ride", "error");
    }
    setAction(rideId, false);
  };

  const handleStart = async (rideId) => {
    setAction(rideId, true);
    try {
      await startRide(rideId);
      showToast("🚗 Ride started!");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not start ride", "error");
    }
    setAction(rideId, false);
  };

  const handleComplete = async (rideId) => {
    setAction(rideId, true);
    try {
      await completeRide(rideId);
      showToast("🏁 Ride completed! Well done.");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not complete ride", "error");
    }
    setAction(rideId, false);
  };

  // Find active ride (accepted or ongoing)
  const activeRide = myRides.find((r) => ["accepted", "ongoing"].includes(r.status));

  const stats = {
    totalRides: myRides.length,
    completed: myRides.filter((r) => r.status === "completed").length,
    earnings: myRides.filter((r) => r.status === "completed").reduce((s, r) => s + r.fare, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display font-bold text-3xl">
                  Driver <span className="text-auto-yellow">Dashboard</span>
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  user?.isOnline ? "bg-green-500 text-white" : "bg-gray-600 text-gray-200"
                }`}>
                  {user?.isOnline ? "🟢 Online" : "⚫ Offline"}
                </span>
              </div>
              <p className="text-gray-400">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400">Vehicle</p>
                <p className="font-bold text-auto-yellow">{user?.vehicleNumber || "N/A"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Rating</p>
                <p className="font-bold text-auto-yellow">
                  ⭐ {user?.averageRating > 0 ? user.averageRating : "New"}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: "🛺", label: "Total Rides", val: stats.totalRides },
              { icon: "✅", label: "Completed", val: stats.completed },
              { icon: "💰", label: "Earnings", val: `₹${stats.earnings}` },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <span className="text-2xl block mb-1">{s.icon}</span>
                <p className="font-display font-bold text-xl text-auto-yellow">{s.val}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Active Ride Banner */}
        {activeRide && (
          <div className={`card mb-6 border-2 animate-slide-up ${
            activeRide.status === "ongoing"
              ? "border-green-400 bg-green-50"
              : "border-auto-yellow bg-yellow-50"
          }`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={activeRide.status} />
                  <span className="text-xs text-gray-500">ACTIVE RIDE</span>
                </div>
                <p className="font-bold text-auto-dark">
                  👤 {activeRide.user?.name} · {activeRide.user?.phone}
                </p>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>📍 <span className="font-semibold">{activeRide.pickupLocation}</span></p>
                  <p>🏁 <span className="font-semibold">{activeRide.dropLocation}</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-3xl text-auto-yellow">₹{activeRide.fare}</p>
                <p className="text-xs text-gray-500">{activeRide.distanceKm} km</p>

                <div className="flex gap-2 mt-3">
                  {activeRide.status === "accepted" && (
                    <button
                      onClick={() => handleStart(activeRide._id)}
                      disabled={actionLoading[activeRide._id]}
                      className="btn-success text-sm px-4 py-2">
                      {actionLoading[activeRide._id] ? "..." : "▶ Start Ride"}
                    </button>
                  )}
                  {activeRide.status === "ongoing" && (
                    <button
                      onClick={() => handleComplete(activeRide._id)}
                      disabled={actionLoading[activeRide._id]}
                      className="btn-primary text-sm px-4 py-2">
                      {actionLoading[activeRide._id] ? "..." : "🏁 Complete Ride"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {["available", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl font-display font-bold capitalize transition-all ${
                activeTab === tab
                  ? "bg-auto-yellow text-auto-dark shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-yellow-50"
              }`}>
              {tab === "available" ? `🛺 Available Rides (${pendingRides.length})` : "📜 My History"}
            </button>
          ))}
        </div>

        {/* Available Rides */}
        {activeTab === "available" && (
          <>
            {!user?.isOnline && (
              <div className="card bg-yellow-50 border-2 border-yellow-300 text-center mb-4">
                <span className="text-3xl block mb-2">⚫</span>
                <p className="font-bold text-gray-700">You are currently offline</p>
                <p className="text-gray-500 text-sm">Go online from the navbar to see ride requests</p>
              </div>
            )}

            {loading ? (
              <Spinner text="Fetching available rides..." />
            ) : pendingRides.length === 0 ? (
              <EmptyState icon="🛺" title="No rides available" subtitle="Check back in a moment..." />
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pendingRides.map((ride) => (
                  <div key={ride._id} className="card hover:shadow-lg transition-all border-l-4 border-auto-yellow animate-slide-up">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-gray-400 font-bold">#{ride._id?.slice(-8).toUpperCase()}</p>
                        <p className="font-bold text-auto-dark">👤 {ride.user?.name}</p>
                        <p className="text-gray-500 text-sm">{ride.user?.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-2xl text-auto-yellow">₹{ride.fare}</p>
                        <p className="text-xs text-gray-400">{ride.distanceKm} km</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-green-500">📍</span>
                        <span className="font-semibold text-gray-700">{ride.pickupLocation}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-500">🏁</span>
                        <span className="font-semibold text-gray-700">{ride.dropLocation}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/ride/${ride._id}`)}
                        className="flex-1 border-2 border-gray-200 py-2 rounded-xl font-bold text-sm hover:border-gray-400 transition-all">
                        View
                      </button>
                      <button
                        onClick={() => handleAccept(ride._id)}
                        disabled={actionLoading[ride._id] || !!activeRide}
                        className="flex-2 flex-1 btn-primary py-2 text-sm disabled:opacity-50">
                        {actionLoading[ride._id] ? "..." : activeRide ? "Busy" : "✅ Accept"}
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(ride.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <>
            {loading ? <Spinner text="Loading history..." /> :
             myRides.length === 0 ? <EmptyState icon="🛺" title="No rides yet" subtitle="Accept your first ride!" /> : (
              <div className="grid md:grid-cols-2 gap-4">
                {myRides.map((ride) => (
                  <div key={ride._id} className="card hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <StatusBadge status={ride.status} />
                      <p className="font-display font-bold text-xl text-auto-yellow">₹{ride.fare}</p>
                    </div>
                    <div className="text-sm space-y-1 mb-3">
                      <p>📍 {ride.pickupLocation}</p>
                      <p>🏁 {ride.dropLocation}</p>
                      {ride.user && <p>👤 {ride.user.name}</p>}
                    </div>
                    {ride.rating && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Rated:</span>
                        <StarRating value={ride.rating} readOnly />
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{new Date(ride.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
