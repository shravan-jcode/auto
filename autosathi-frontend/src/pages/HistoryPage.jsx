import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyRides } from "../utils/api";
import { Spinner, EmptyState, RideCard, Toast } from "../components/UI";

export default function HistoryPage() {
  const [rides, setRides]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [toast, setToast]     = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMyRides()
      .then((res) => setRides(res.data.rides))
      .catch(() => setToast({ message: "Failed to load rides", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const filters = ["all", "pending", "accepted", "ongoing", "completed", "cancelled"];
  const filtered = filter === "all" ? rides : rides.filter((r) => r.status === filter);

  // Summary counts
  const counts = {
    total: rides.length,
    completed: rides.filter((r) => r.status === "completed").length,
    cancelled: rides.filter((r) => r.status === "cancelled").length,
    totalSpent: rides.filter((r) => r.status === "completed").reduce((sum, r) => sum + r.fare, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="font-display font-bold text-3xl mb-1">
            📜 Ride <span className="text-auto-yellow">History</span>
          </h1>
          <p className="text-gray-400">All your past and current rides</p>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: "🛺", label: "Total Rides", val: counts.total },
            { icon: "✅", label: "Completed", val: counts.completed },
            { icon: "❌", label: "Cancelled", val: counts.cancelled },
            { icon: "💰", label: "Total Spent", val: `₹${counts.totalSpent}` },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <span className="text-3xl block mb-1">{s.icon}</span>
              <p className="font-display font-bold text-2xl text-auto-dark">{s.val}</p>
              <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                filter === f
                  ? "bg-auto-yellow text-auto-dark shadow-md"
                  : "bg-white text-gray-600 hover:bg-yellow-50 border border-gray-200"
              }`}>
              {f} {f !== "all" && `(${rides.filter((r) => r.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Rides List */}
        {loading ? (
          <Spinner text="Loading your rides..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🛺"
            title="No rides found"
            subtitle={filter === "all" ? "Book your first auto ride!" : `No ${filter} rides`}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((ride) => (
              <RideCard
                key={ride._id}
                ride={ride}
                actions={
                  <button
                    onClick={() => navigate(`/ride/${ride._id}`)}
                    className="text-auto-yellow font-bold text-sm hover:underline">
                    View Details →
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
