import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingRides, getDriverHistory, acceptRide, completeRide, verifyOTP } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, Spinner, EmptyState, Toast, StarRating } from "../components/UI";
import MapView from "../components/MapView";

/* ── OTP Verify Panel (driver enters passenger's OTP) ─────── */
function OTPVerifyPanel({ rideId, onVerified, showToast }) {
  const [code,      setCode]      = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempts,  setAttempts]  = useState(0);

  const handleVerify = async () => {
    if (code.length !== 6) { showToast("Enter the 6-digit OTP", "error"); return; }
    setVerifying(true);
    try {
      await verifyOTP(rideId, code);
      showToast("✅ OTP Verified! Ride started!", "success");
      onVerified();
    } catch (err) {
      const msg = err.response?.data?.message || "Wrong OTP";
      showToast(msg, "error");
      const left = err.response?.data?.attemptsLeft;
      if (left !== undefined) setAttempts(5 - left);
      setCode("");
    }
    setVerifying(false);
  };

  return (
    <div className="bg-amber-50 border-2 border-auto-yellow rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔑</span>
        <div>
          <p className="font-display font-bold text-auto-dark">Enter Passenger OTP</p>
          <p className="text-xs text-gray-500">Ask passenger to show their OTP screen, then type it below</p>
        </div>
      </div>

      {/* 6-box OTP input */}
      <div className="flex gap-2 justify-center">
        {[0,1,2,3,4,5].map(i => (
          <input key={i} type="text" maxLength={1} readOnly
            value={code[i] || ""}
            className={`w-11 h-14 text-center text-2xl font-display font-bold rounded-xl border-2 transition-all
              ${code[i] ? "border-auto-yellow bg-auto-yellow/10" : "border-gray-300 bg-white"}`}
          />
        ))}
      </div>

      {/* Hidden real input */}
      <input
        type="number"
        className="sr-only"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
        id="otp-hidden"
      />
      <label htmlFor="otp-hidden"
        className="block text-center text-xs text-auto-yellow font-bold cursor-pointer underline">
        Tap here to type OTP
      </label>

      {/* Real visible input for typing */}
      <input
        type="tel"
        inputMode="numeric"
        maxLength={6}
        placeholder="Type 6-digit OTP"
        className="input-field text-center text-2xl font-display font-bold tracking-widest py-3"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
      />

      {attempts > 0 && (
        <p className="text-xs text-red-500 text-center font-semibold">
          ⚠️ {attempts} wrong attempt{attempts>1?"s":""} — {5-attempts} remaining
        </p>
      )}

      <button onClick={handleVerify} disabled={verifying || code.length !== 6}
        className="btn-primary w-full py-3 disabled:opacity-50 text-base">
        {verifying
          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-auto-dark border-t-transparent rounded-full animate-spin" />Verifying…</span>
          : "▶ Verify & Start Ride"}
      </button>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function DriverDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [pending,   setPending]   = useState([]);
  const [myRides,   setMyRides]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState({});
  const [tab,       setTab]       = useState("available");
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type="success") => { setToast({ message: msg, type }); setTimeout(()=>setToast(null),4000); };

  const load = useCallback(async () => {
    try {
      const [pr, mr] = await Promise.all([getPendingRides(), getDriverHistory()]);
      setPending(pr.data.rides);
      setMyRides(mr.data.rides);
    } catch { showToast("Failed to load rides","error"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 7000); return () => clearInterval(t); }, [load]);

  const setBusyFor = (id, v) => setBusy(b => ({ ...b, [id]: v }));

  const handleAccept = async (rideId) => {
    setBusyFor(rideId, true);
    try { await acceptRide(rideId); showToast("✅ Ride accepted! OTP sent to passenger."); load(); }
    catch (e) { showToast(e.response?.data?.message||"Could not accept","error"); }
    setBusyFor(rideId, false);
  };

  const handleComplete = async (rideId) => {
    setBusyFor(rideId, true);
    try { await completeRide(rideId); showToast("🏁 Ride completed! Well done."); load(); }
    catch (e) { showToast(e.response?.data?.message||"Could not complete","error"); }
    setBusyFor(rideId, false);
  };

  const activeRide = myRides.find(r => ["otp_pending","ongoing"].includes(r.status));
  const stats = {
    total:     myRides.length,
    completed: myRides.filter(r=>r.status==="completed").length,
    earnings:  myRides.filter(r=>r.status==="completed").reduce((s,r)=>s+r.fare,0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-7">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display font-bold text-3xl">Driver <span className="text-auto-yellow">Dashboard</span></h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user?.isOnline?"bg-green-500":"bg-gray-600"}`}>
                  {user?.isOnline ? "🟢 Online" : "⚫ Offline"}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{user?.name} · {user?.vehicleNumber || "—"}</p>
            </div>
            <span className="text-auto-yellow font-bold">⭐ {user?.averageRating > 0 ? user.averageRating : "New"}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[["🛺","Total",stats.total],["✅","Done",stats.completed],["💰","Earned","₹"+stats.earnings]].map(([ico,lbl,val])=>(
              <div key={lbl} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xl mb-0.5">{ico}</p>
                <p className="font-display font-bold text-xl text-auto-yellow">{val}</p>
                <p className="text-xs text-gray-400">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* Active ride panel */}
        {activeRide && (
          <div className={`card border-2 ${activeRide.status==="ongoing"?"border-green-400":"border-auto-yellow"} animate-slide-up`}>
            <div className="flex flex-wrap gap-4 justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={activeRide.status} />
                  <span className="text-xs text-gray-500 font-bold uppercase">Active Ride</span>
                </div>
                <p className="font-bold text-auto-dark">👤 {activeRide.user?.name} · {activeRide.user?.phone}</p>
                <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                  <p>📍 {activeRide.pickupLocation}</p>
                  <p>🏁 {activeRide.dropLocation}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-3xl text-auto-yellow">₹{activeRide.fare}</p>
                <p className="text-xs text-gray-400">{activeRide.distanceKm} km</p>
                {activeRide.status === "ongoing" && (
                  <button onClick={()=>handleComplete(activeRide._id)} disabled={busy[activeRide._id]}
                    className="btn-primary mt-2 text-sm px-5 py-2 disabled:opacity-60">
                    {busy[activeRide._id] ? "…" : "🏁 Complete Ride"}
                  </button>
                )}
              </div>
            </div>

            {/* OTP verify (only when otp_pending) */}
            {activeRide.status === "otp_pending" && (
              <div className="mb-4">
                <OTPVerifyPanel rideId={activeRide._id} onVerified={load} showToast={showToast} />
              </div>
            )}

            {activeRide.status === "ongoing" && (
              <div className="bg-green-50 border border-green-300 rounded-xl p-2.5 text-sm text-green-700 font-semibold mb-4">
                ✅ OTP verified — ride is ongoing
              </div>
            )}

            {/* Route map for active ride */}
            {(activeRide.pickupCoords?.lat || activeRide.dropCoords?.lat) && (
              <MapView
                mode="route"
                pickupCoords={activeRide.pickupCoords?.lat ? activeRide.pickupCoords : null}
                dropCoords={activeRide.dropCoords?.lat   ? activeRide.dropCoords   : null}
                height="260px"
                className="mt-2"
              />
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[["available","🛺 Available ("+pending.length+")"],["history","📜 My History"]].map(([t,lbl])=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-5 py-2 rounded-xl font-display font-bold transition-all text-sm ${tab===t?"bg-auto-yellow text-auto-dark shadow-md":"bg-white text-gray-600 border border-gray-200 hover:bg-yellow-50"}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Available rides */}
        {tab === "available" && (
          <>
            {!user?.isOnline && (
              <div className="card bg-yellow-50 border-2 border-yellow-300 text-center">
                <p className="text-3xl mb-2">⚫</p>
                <p className="font-bold">You are offline</p>
                <p className="text-gray-500 text-sm">Go online from the navbar to receive rides</p>
              </div>
            )}
            {loading ? <Spinner text="Loading rides…" /> :
             pending.length === 0 ? <EmptyState icon="🛺" title="No rides available" subtitle="Check back soon" /> : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pending.map(ride => (
                  <div key={ride._id} className="card hover:shadow-xl transition-all border-l-4 border-auto-yellow">
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

                    <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm space-y-1">
                      <p>📍 <span className="font-semibold">{ride.pickupLocation}</span></p>
                      <p>🏁 <span className="font-semibold">{ride.dropLocation}</span></p>
                    </div>

                    {/* Mini map preview */}
                    {ride.pickupCoords?.lat && ride.dropCoords?.lat && (
                      <MapView mode="route" pickupCoords={ride.pickupCoords} dropCoords={ride.dropCoords} height="140px" className="mb-3" />
                    )}

                    <div className="flex gap-2">
                      <button onClick={()=>navigate(`/ride/${ride._id}`)} className="flex-1 border-2 border-gray-200 py-2 rounded-xl font-bold text-sm hover:border-gray-400 transition-all">View</button>
                      <button onClick={()=>handleAccept(ride._id)} disabled={busy[ride._id]||!!activeRide}
                        className="flex-1 btn-primary py-2 text-sm disabled:opacity-50">
                        {busy[ride._id] ? "…" : activeRide ? "Busy" : "✅ Accept"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{new Date(ride.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* History */}
        {tab === "history" && (
          loading ? <Spinner text="Loading…" /> :
          myRides.length === 0 ? <EmptyState icon="🛺" title="No rides yet" subtitle="Accept your first ride!" /> : (
            <div className="grid md:grid-cols-2 gap-4">
              {myRides.map(ride => (
                <div key={ride._id} className="card hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <StatusBadge status={ride.status} />
                    <p className="font-display font-bold text-xl text-auto-yellow">₹{ride.fare}</p>
                  </div>
                  <div className="text-sm space-y-0.5 mb-3">
                    <p>📍 {ride.pickupLocation}</p>
                    <p>🏁 {ride.dropLocation}</p>
                    {ride.user && <p className="text-gray-500">👤 {ride.user.name}</p>}
                  </div>
                  {ride.rating && <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><span>Rated:</span><StarRating value={ride.rating} readOnly /></div>}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">{new Date(ride.createdAt).toLocaleString("en-IN")}</p>
                    <button onClick={()=>navigate(`/ride/${ride._id}`)} className="text-xs text-auto-yellow font-bold hover:underline">View →</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
