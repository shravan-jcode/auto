import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRideById, cancelRide, rateDriver, getOTP, regenerateOTP } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, Spinner, Toast, StarRating } from "../components/UI";
import MapView from "../components/MapView";

/* ── OTP Display Card (user's screen) ─────────────────────
   The OTP is shown right here — user holds phone up to driver */
function OTPCard({ rideId, onRefreshed }) {
  const [otpData, setOtpData]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh] = useState(false);

  const fetchOTP = useCallback(async () => {
    try {
      const res = await getOTP(rideId);
      setOtpData(res.data);
    } catch { /* OTP not yet generated — driver hasn't accepted */ }
    setLoading(false);
  }, [rideId]);

  useEffect(() => { fetchOTP(); }, [fetchOTP]);

  const handleRegenerate = async () => {
    setRefresh(true);
    try {
      const res = await regenerateOTP(rideId);
      setOtpData({ otp: res.data.otp, expiresAt: res.data.expiresAt, verified: false, expired: false });
      onRefreshed?.();
    } catch {}
    setRefresh(false);
  };

  if (loading) return null;

  return (
    <div className="card border-2 border-auto-yellow bg-yellow-50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🔐</span>
        <div>
          <p className="font-display font-bold text-auto-dark">Your Ride OTP</p>
          <p className="text-xs text-gray-500">Show this to your driver at pickup to start the ride</p>
        </div>
      </div>

      {otpData?.verified ? (
        <div className="bg-green-100 rounded-xl p-3 text-center">
          <p className="text-green-700 font-bold text-lg">✅ OTP Verified</p>
          <p className="text-green-600 text-sm">Your ride has started!</p>
        </div>
      ) : otpData?.otp && !otpData?.expired ? (
        <>
          {/* Big OTP display */}
          <div className="bg-auto-dark rounded-2xl p-5 text-center mb-3">
            <p className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">Your OTP Code</p>
            <div className="flex justify-center gap-2">
              {String(otpData.otp).split("").map((d, i) => (
                <div key={i}
                  className="w-10 h-14 bg-auto-yellow rounded-xl flex items-center justify-center font-display font-bold text-3xl text-auto-dark shadow-lg">
                  {d}
                </div>
              ))}
            </div>
            {otpData.expiresAt && (
              <p className="text-gray-400 text-xs mt-3">
                ⏱ Expires at {new Date(otpData.expiresAt).toLocaleTimeString("en-IN", {hour:"2-digit", minute:"2-digit"})}
              </p>
            )}
          </div>
          <p className="text-xs text-center text-gray-500 mb-2">
            📱 Tell your driver: <span className="font-bold text-auto-dark">{otpData.otp}</span>
          </p>
        </>
      ) : (
        <div className="bg-gray-100 rounded-xl p-3 text-center text-sm text-gray-500">
          {otpData?.expired ? "⚠️ OTP expired." : "⏳ Waiting for driver to arrive…"}
        </div>
      )}

      {/* Regenerate button — if expired or missing */}
      {(!otpData?.otp || otpData?.expired) && !otpData?.verified && (
        <button onClick={handleRegenerate} disabled={refreshing}
          className="btn-secondary w-full mt-3 py-2 text-sm disabled:opacity-50">
          {refreshing ? "Generating…" : "🔄 Generate New OTP"}
        </button>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────── */
export default function RideDetailPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ride,      setRide]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);
  const [cancelling,setCancelling]= useState(false);
  const [showRating,setShowRating]= useState(false);
  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState("");
  const [submitting,setSubmitting]= useState(false);

  const showToast = (msg, type="success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 4000); };

  const fetchRide = useCallback(async () => {
    try { const r = await getRideById(id); setRide(r.data.ride); }
    catch { showToast("Could not load ride details","error"); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRide();
    const t = setInterval(fetchRide, 5000);
    return () => clearInterval(t);
  }, [fetchRide]);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this ride?")) return;
    setCancelling(true);
    try { await cancelRide(id,"Cancelled by user"); showToast("Ride cancelled","warning"); fetchRide(); }
    catch (e) { showToast(e.response?.data?.message||"Cancel failed","error"); }
    setCancelling(false);
  };

  const handleRate = async () => {
    if (!rating) { showToast("Select a rating","error"); return; }
    setSubmitting(true);
    try { await rateDriver(id, rating, comment); showToast("⭐ Thank you!","success"); setShowRating(false); fetchRide(); }
    catch (e) { showToast(e.response?.data?.message||"Rating failed","error"); }
    setSubmitting(false);
  };

  const steps = ["pending","otp_pending","ongoing","completed"];
  const stepIdx = steps.indexOf(ride?.status);

  const hasMap = ride && (ride.pickupCoords?.lat || ride.dropCoords?.lat || ride.driverLocation?.lat);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner text="Loading ride…" /></div>;
  if (!ride)   return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Ride not found.</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm mb-3 block">← Back</button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display font-bold text-2xl">Ride Details</h1>
              <p className="text-gray-400 text-xs mt-1">#{ride._id?.slice(-8).toUpperCase()}</p>
            </div>
            <StatusBadge status={ride.status} />
          </div>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="grid md:grid-cols-2 gap-4">

          {/* ── Left column ──────────────────────────── */}
          <div className="space-y-4">

            {/* Progress bar */}
            {ride.status !== "cancelled" && (
              <div className="card">
                <h3 className="font-display font-bold mb-4 text-sm">🚦 Progress</h3>
                <div className="flex items-center">
                  {steps.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIdx ? "bg-auto-yellow text-auto-dark":"bg-gray-200 text-gray-400"}`}>
                          {i < stepIdx ? "✓" : i + 1}
                        </div>
                        <span className={`text-xs mt-1 font-semibold ${i <= stepIdx ? "text-auto-yellow":"text-gray-400"}`}>
                          {s === "otp_pending" ? "OTP" : s}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`flex-1 h-1 mx-1 rounded ${i < stepIdx ? "bg-auto-yellow":"bg-gray-200"}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Fare */}
            <div className="card bg-gradient-to-r from-auto-dark to-auto-card text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-400 text-xs uppercase">Fare</p>
                  <p className="font-display font-bold text-4xl text-auto-yellow">₹{ride.fare}</p>
                  <p className="text-gray-400 text-xs mt-1">{ride.distanceKm} km</p>
                </div>
                <span className="text-5xl">🛺</span>
              </div>
            </div>

            {/* Route */}
            <div className="card">
              <h3 className="font-display font-bold mb-3">📍 Route</h3>
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1 flex-shrink-0">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <div className="flex-1 my-1" style={{borderLeft:"2px dashed #d1d5db",minHeight:20}} />
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                </div>
                <div className="flex-1 space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Pickup</p>
                    <p className="font-bold">{ride.pickupLocation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Drop</p>
                    <p className="font-bold">{ride.dropLocation}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver info */}
            {ride.driver && (
              <div className="card border-l-4 border-auto-yellow">
                <h3 className="font-display font-bold mb-3">👨‍✈️ Driver</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-auto-yellow/20 rounded-full flex items-center justify-center text-2xl">👨‍✈️</div>
                  <div>
                    <p className="font-bold text-auto-dark">{ride.driver.name}</p>
                    <p className="text-gray-500 text-sm">{ride.driver.phone}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">{ride.driver.vehicleNumber}</span>
                      {ride.driver.averageRating > 0 && <span className="text-xs">⭐ {ride.driver.averageRating}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OTP card — shown to user when ride is otp_pending */}
            {ride.status === "otp_pending" && user?.role === "user" && (
              <OTPCard rideId={ride._id} onRefreshed={fetchRide} />
            )}

            {/* Status messages */}
            {ride.status === "pending" && (
              <div className="card text-center border-2 border-dashed border-auto-yellow">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-5 h-5 border-2 border-auto-yellow border-t-transparent rounded-full animate-spin" />
                  <span className="font-bold text-gray-600">Searching for driver…</span>
                </div>
                <p className="text-gray-400 text-sm">Usually 1–3 minutes</p>
              </div>
            )}
            {ride.status === "ongoing" && (
              <div className="card bg-green-50 border-2 border-green-200 text-center">
                <p className="text-2xl mb-1">🚗</p>
                <p className="font-display font-bold text-green-700">Ride in progress!</p>
                <p className="text-green-600 text-sm">You'll arrive soon</p>
              </div>
            )}

            {/* Rating */}
            {ride.status === "completed" && !ride.rating && user?.role === "user" && (
              <div className="card border-2 border-auto-yellow text-center">
                <p className="text-3xl mb-2">⭐</p>
                <h3 className="font-display font-bold mb-2">Rate Your Driver</h3>
                {!showRating ? (
                  <button onClick={() => setShowRating(true)} className="btn-primary px-8">Give Rating</button>
                ) : (
                  <div className="space-y-3">
                    <StarRating value={rating} onChange={setRating} />
                    <textarea placeholder="Comment (optional)…" rows={2} className="input-field text-sm"
                      value={comment} onChange={e => setComment(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => setShowRating(false)} className="flex-1 border-2 border-gray-200 py-2 rounded-xl font-bold text-sm hover:border-gray-400">Cancel</button>
                      <button onClick={handleRate} disabled={submitting} className="flex-1 btn-primary py-2 text-sm disabled:opacity-60">
                        {submitting ? "…" : "Submit ⭐"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {ride.rating && (
              <div className="card text-center bg-purple-50 border border-purple-200">
                <p className="font-bold text-purple-700 mb-2">You rated this ride</p>
                <StarRating value={ride.rating} readOnly />
                {ride.ratingComment && <p className="text-sm text-gray-500 mt-2">"{ride.ratingComment}"</p>}
              </div>
            )}

            {/* Payment */}
            {ride.status === "completed" && user?.role === "user" && (
              <div className={`card border-2 ${ride.payment?.status==="paid"?"border-green-400 bg-green-50":"border-orange-300 bg-orange-50"}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold">💳 Payment</h3>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${ride.payment?.status==="paid"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}`}>
                    {ride.payment?.status === "paid" ? "✅ Paid" : "⏳ Unpaid"}
                  </span>
                </div>
                {ride.payment?.status === "paid"
                  ? <p className="text-sm text-gray-600">₹{ride.fare} paid via <span className="font-bold uppercase">{ride.payment.method}</span></p>
                  : <button onClick={() => navigate(`/payment/${ride._id}`)} className="btn-primary w-full py-2.5 text-sm">💳 Pay ₹{ride.fare}</button>
                }
              </div>
            )}

            {/* Cancel */}
            {["pending","otp_pending"].includes(ride.status) && user?.role === "user" && (
              <button onClick={handleCancel} disabled={cancelling} className="btn-danger w-full py-3 disabled:opacity-60">
                {cancelling ? "Cancelling…" : "❌ Cancel Ride"}
              </button>
            )}

            <p className="text-center text-xs text-gray-400">Booked {new Date(ride.createdAt).toLocaleString("en-IN")}</p>
          </div>

          {/* ── Right column: map ─────────────────────── */}
          <div className="space-y-4">
            {hasMap ? (
              <div className="card p-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <h3 className="font-display font-bold text-auto-dark">
                    {ride.status === "ongoing" ? "🛺 Live Tracking" : "🗺️ Route Map"}
                  </h3>
                  {ride.status === "ongoing" && ride.driverLocation?.lat && (
                    <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping inline-block" />Live
                    </span>
                  )}
                </div>
                <MapView
                  mode={ride.status === "ongoing" ? "tracking" : "route"}
                  pickupCoords={ride.pickupCoords?.lat ? ride.pickupCoords : null}
                  dropCoords={ride.dropCoords?.lat   ? ride.dropCoords   : null}
                  driverCoords={ride.driverLocation?.lat ? ride.driverLocation : null}
                  height="400px"
                />
              </div>
            ) : (
              <div className="card text-center py-16 border-2 border-dashed border-gray-200">
                <p className="text-5xl mb-3">🗺️</p>
                <p className="font-bold text-gray-400">Map appears here</p>
                <p className="text-sm text-gray-300 mt-1">once a driver accepts</p>
              </div>
            )}

            {/* Summary table */}
            <div className="card text-sm">
              <h3 className="font-display font-bold mb-3 text-gray-500 text-xs uppercase tracking-wide">Summary</h3>
              <div className="space-y-2">
                {[
                  ["ID",        "#" + ride._id?.slice(-8).toUpperCase()],
                  ["Distance",  ride.distanceKm + " km"],
                  ["Fare",      "₹" + ride.fare],
                  ["Status",    ride.status],
                  ["Payment",   ride.payment?.status || "unpaid"],
                  ...(ride.acceptedAt  ? [["Accepted",  new Date(ride.acceptedAt).toLocaleTimeString("en-IN")]]  : []),
                  ...(ride.startedAt   ? [["Started",   new Date(ride.startedAt).toLocaleTimeString("en-IN")]]   : []),
                  ...(ride.completedAt ? [["Completed", new Date(ride.completedAt).toLocaleTimeString("en-IN")]] : []),
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
