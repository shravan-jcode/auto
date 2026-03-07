import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRideById, cancelRide, rateDriver } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, Spinner, Toast, StarRating } from "../components/UI";

export default function RideDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ride, setRide]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRide = useCallback(async () => {
    try {
      const res = await getRideById(id);
      setRide(res.data.ride);
    } catch {
      showToast("Could not load ride details", "error");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRide();
    // Poll for status updates when ride is active
    const interval = setInterval(() => {
      if (ride && ["pending", "accepted", "ongoing"].includes(ride.status)) {
        fetchRide();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRide, ride?.status]);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this ride?")) return;
    setCancelling(true);
    try {
      await cancelRide(id, "Cancelled by user");
      showToast("Ride cancelled", "warning");
      fetchRide();
    } catch (err) {
      showToast(err.response?.data?.message || "Cancel failed", "error");
    }
    setCancelling(false);
  };

  const handleRating = async () => {
    if (rating === 0) { showToast("Please select a rating", "error"); return; }
    setSubmitting(true);
    try {
      await rateDriver(id, rating, comment);
      showToast("⭐ Thank you for your rating!", "success");
      setShowRating(false);
      fetchRide();
    } catch (err) {
      showToast(err.response?.data?.message || "Rating failed", "error");
    }
    setSubmitting(false);
  };

  const statusSteps = ["pending", "accepted", "ongoing", "completed"];
  const currentStep = statusSteps.indexOf(ride?.status);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner text="Loading ride details..." />
    </div>
  );

  if (!ride) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="text-6xl">😕</span>
        <p className="mt-4 font-bold text-gray-600">Ride not found</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary mt-4">
          Go Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm mb-4 block">
            ← Back
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display font-bold text-2xl">Ride Details</h1>
              <p className="text-gray-400 text-sm mt-1">#{ride._id?.slice(-8).toUpperCase()}</p>
            </div>
            <StatusBadge status={ride.status} />
          </div>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Progress Tracker */}
        {ride.status !== "cancelled" && (
          <div className="card">
            <h3 className="font-display font-bold mb-4">🚦 Ride Progress</h3>
            <div className="flex items-center gap-0">
              {statusSteps.map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i <= currentStep
                        ? "bg-auto-yellow text-auto-dark"
                        : "bg-gray-200 text-gray-400"
                    }`}>
                      {i < currentStep ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs mt-1 capitalize font-semibold ${
                      i <= currentStep ? "text-auto-yellow" : "text-gray-400"
                    }`}>{s}</span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded ${
                      i < currentStep ? "bg-auto-yellow" : "bg-gray-200"
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Fare Card */}
        <div className="card bg-gradient-to-r from-auto-dark to-auto-card text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">TOTAL FARE</p>
              <p className="font-display font-bold text-4xl text-auto-yellow">₹{ride.fare}</p>
              <p className="text-gray-400 text-sm mt-1">{ride.distanceKm} km</p>
            </div>
            <span className="text-5xl">🛺</span>
          </div>
        </div>

        {/* Route */}
        <div className="card">
          <h3 className="font-display font-bold mb-4">📍 Route</h3>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div className="w-0.5 bg-dashed bg-gray-300 flex-1 my-1" style={{ minHeight: 24, borderLeft: "2px dashed #ccc" }} />
              <div className="w-3 h-3 bg-red-500 rounded-full" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Pickup</p>
                <p className="font-bold text-gray-800">{ride.pickupLocation}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Drop</p>
                <p className="font-bold text-gray-800">{ride.dropLocation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        {ride.driver && (
          <div className="card border-l-4 border-auto-yellow">
            <h3 className="font-display font-bold mb-3">👨‍✈️ Your Driver</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-auto-yellow/20 rounded-full flex items-center justify-center text-3xl">
                👨‍✈️
              </div>
              <div className="flex-1">
                <p className="font-bold text-auto-dark text-lg">{ride.driver.name}</p>
                <p className="text-gray-500 text-sm">{ride.driver.phone}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {ride.driver.vehicleNumber}
                  </span>
                  {ride.driver.averageRating > 0 && (
                    <span className="text-sm">⭐ {ride.driver.averageRating}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Waiting for driver */}
        {ride.status === "pending" && (
          <div className="card text-center border-2 border-dashed border-auto-yellow">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-5 h-5 border-2 border-auto-yellow border-t-transparent rounded-full animate-spin" />
              <span className="font-bold text-gray-600">Searching for nearby driver...</span>
            </div>
            <p className="text-gray-400 text-sm">This usually takes 1-3 minutes</p>
          </div>
        )}

        {/* Ongoing live indicator */}
        {ride.status === "ongoing" && (
          <div className="card bg-green-50 border-2 border-green-200 text-center">
            <span className="text-3xl block mb-2">🚗</span>
            <p className="font-display font-bold text-green-700">Ride is in progress!</p>
            <p className="text-green-600 text-sm">Hang tight, you'll reach soon</p>
          </div>
        )}

        {/* Rating prompt */}
        {ride.status === "completed" && !ride.rating && user?.role === "user" && (
          <div className="card border-2 border-auto-yellow text-center">
            <span className="text-4xl block mb-2">⭐</span>
            <h3 className="font-display font-bold mb-2">Rate Your Driver</h3>
            <p className="text-gray-500 text-sm mb-4">How was your ride with {ride.driver?.name}?</p>
            {!showRating ? (
              <button onClick={() => setShowRating(true)} className="btn-primary px-8">
                Give Rating
              </button>
            ) : (
              <div className="space-y-4">
                <StarRating value={rating} onChange={setRating} />
                <textarea
                  placeholder="Write a comment (optional)..."
                  className="input-field text-sm"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowRating(false)}
                    className="flex-1 border-2 border-gray-200 py-2 rounded-xl font-bold hover:border-gray-400 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleRating} disabled={submitting}
                    className="flex-1 btn-primary py-2 disabled:opacity-60">
                    {submitting ? "Submitting..." : "Submit ⭐"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Already rated */}
        {ride.rating && (
          <div className="card text-center bg-purple-50 border border-purple-200">
            <p className="font-bold text-purple-700 mb-2">You rated this ride</p>
            <StarRating value={ride.rating} readOnly />
            {ride.ratingComment && <p className="text-sm text-gray-500 mt-2">"{ride.ratingComment}"</p>}
          </div>
        )}

        {/* Cancel button */}
        {["pending", "accepted"].includes(ride.status) && user?.role === "user" && (
          <button onClick={handleCancel} disabled={cancelling}
            className="btn-danger w-full py-3 disabled:opacity-60">
            {cancelling ? "Cancelling..." : "❌ Cancel Ride"}
          </button>
        )}

        <p className="text-center text-xs text-gray-400">
          Booked on {new Date(ride.createdAt).toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}
