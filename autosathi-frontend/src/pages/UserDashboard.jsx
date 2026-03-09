import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { calcFare, bookRide } from "../utils/api";
import { Toast } from "../components/UI";
import MapView, { searchPlaces, calcDistKm } from "../components/MapView";

export default function UserDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const searchTimer = useRef(null);

  // Location state
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords,   setDropCoords]   = useState(null);
  const [pickupName,   setPickupName]   = useState("");
  const [dropName,     setDropName]     = useState("");

  // Search boxes
  const [pickupQ,      setPickupQ]      = useState("");
  const [dropQ,        setDropQ]        = useState("");
  const [pickupRes,    setPickupRes]    = useState([]);
  const [dropRes,      setDropRes]      = useState([]);
  const [searching,    setSearching]    = useState({ pickup: false, drop: false });

  // Flow
  const [fareData, setFareData] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [booking,  setBooking]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [step,     setStep]     = useState("map"); // map | fare | booked

  const showToast = (msg, type="success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const distKm = pickupCoords && dropCoords ? calcDistKm(pickupCoords, dropCoords) : null;

  // ── Map click handlers ────────────────────────────────
  const handlePickupSelect = (coords, name) => {
    setPickupCoords(coords);
    if (name) { setPickupName(name); setPickupQ(name); }
  };
  const handleDropSelect = (coords, name) => {
    setDropCoords(coords);
    if (name) { setDropName(name); setDropQ(name); }
  };

  // ── Text search with debounce ─────────────────────────
  const handleSearch = (type, q) => {
    if (type === "pickup") setPickupQ(q);
    else setDropQ(q);
    clearTimeout(searchTimer.current);
    if (q.length < 3) { type === "pickup" ? setPickupRes([]) : setDropRes([]); return; }
    setSearching(s => ({ ...s, [type]: true }));
    searchTimer.current = setTimeout(async () => {
      const res = await searchPlaces(q);
      type === "pickup" ? setPickupRes(res) : setDropRes(res);
      setSearching(s => ({ ...s, [type]: false }));
    }, 400);
  };

  const pickResult = (type, r) => {
    if (type === "pickup") {
      setPickupCoords({ lat: r.lat, lng: r.lng }); setPickupName(r.name); setPickupQ(r.name); setPickupRes([]);
    } else {
      setDropCoords({ lat: r.lat, lng: r.lng }); setDropName(r.name); setDropQ(r.name); setDropRes([]);
    }
  };

  // ── Swap pickup ↔ drop ────────────────────────────────
  const swapLocations = () => {
    const [tc, tn, tq] = [pickupCoords, pickupName, pickupQ];
    setPickupCoords(dropCoords); setPickupName(dropName); setPickupQ(dropQ);
    setDropCoords(tc); setDropName(tn); setDropQ(tq);
  };

  // ── Check fare ────────────────────────────────────────
  const handleCheckFare = async () => {
    if (!pickupCoords || !dropCoords) { showToast("Select both locations on the map", "error"); return; }
    if (!distKm || distKm < 0.1)     { showToast("Locations too close or invalid", "error"); return; }
    setLoading(true);
    try {
      const res = await calcFare({ pickupLocation: pickupName || "Pickup", dropLocation: dropName || "Drop", distanceKm: distKm });
      setFareData(res.data);
      setStep("fare");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to calculate fare", "error");
    }
    setLoading(false);
  };

  // ── Book ride ─────────────────────────────────────────
  const handleBook = async () => {
    setBooking(true);
    try {
      const res = await bookRide({
        pickupLocation: pickupName || "Pickup",
        dropLocation:   dropName   || "Drop",
        distanceKm:     distKm,
        pickupCoords,
        dropCoords,
      });
      setStep("booked");
      setTimeout(() => navigate(`/ride/${res.data.ride._id}`), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || "Booking failed", "error");
    }
    setBooking(false);
  };

  const resetAll = () => {
    setPickupCoords(null); setDropCoords(null);
    setPickupName(""); setDropName(""); setPickupQ(""); setDropQ("");
    setFareData(null); setStep("map");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-3xl">
                Namaste, <span className="text-auto-yellow">{user?.name?.split(" ")[0]}</span>! 👋
              </h1>
              <p className="text-gray-400 text-sm mt-1">Pin your pickup &amp; drop on the map, then book</p>
            </div>
            <button onClick={() => navigate("/history")}
              className="border border-white/30 text-white px-4 py-2 rounded-xl font-semibold hover:border-auto-yellow hover:text-auto-yellow transition-all text-sm">
              📜 My Rides
            </button>
          </div>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Left: form ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {step === "map" && (
              <>
                {/* Location inputs */}
                <div className="card space-y-3">
                  <h2 className="font-display font-bold text-lg text-auto-dark">📍 Your Route</h2>

                  {/* Pickup */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      🟢 Pickup
                    </label>
                    <input
                      type="text" placeholder="Search area or click map…"
                      className="input-field text-sm"
                      value={pickupQ}
                      onChange={e => handleSearch("pickup", e.target.value)}
                    />
                    {searching.pickup && (
                      <div className="absolute right-3 top-9 w-4 h-4 border-2 border-auto-yellow border-t-transparent rounded-full animate-spin" />
                    )}
                    {pickupRes.length > 0 && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 max-h-48 overflow-y-auto">
                        {pickupRes.map((r, i) => (
                          <li key={i}>
                            <button onClick={() => pickResult("pickup", r)}
                              className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-sm border-b border-gray-50 last:border-0">
                              <span className="text-green-500 mr-1.5">📍</span>{r.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {pickupCoords && (
                      <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                        {pickupCoords.lat.toFixed(5)}, {pickupCoords.lng.toFixed(5)}
                      </p>
                    )}
                  </div>

                  {/* Swap */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-100" />
                    <button onClick={swapLocations} title="Swap"
                      className="w-8 h-8 bg-auto-yellow rounded-full flex items-center justify-center text-auto-dark font-bold text-base hover:scale-110 transition-transform">
                      ⇅
                    </button>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Drop */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      🔴 Drop
                    </label>
                    <input
                      type="text" placeholder="Search area or click map…"
                      className="input-field text-sm"
                      value={dropQ}
                      onChange={e => handleSearch("drop", e.target.value)}
                    />
                    {searching.drop && (
                      <div className="absolute right-3 top-9 w-4 h-4 border-2 border-auto-yellow border-t-transparent rounded-full animate-spin" />
                    )}
                    {dropRes.length > 0 && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 max-h-48 overflow-y-auto">
                        {dropRes.map((r, i) => (
                          <li key={i}>
                            <button onClick={() => pickResult("drop", r)}
                              className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-sm border-b border-gray-50 last:border-0">
                              <span className="text-red-500 mr-1.5">🏁</span>{r.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {dropCoords && (
                      <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                        {dropCoords.lat.toFixed(5)}, {dropCoords.lng.toFixed(5)}
                      </p>
                    )}
                  </div>

                  {/* Auto distance */}
                  {distKm !== null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                      <span className="text-2xl">📏</span>
                      <div>
                        <p className="text-xs text-blue-500 font-bold uppercase tracking-wide">Auto Distance</p>
                        <p className="font-display font-bold text-blue-800 text-xl">{distKm} km</p>
                      </div>
                    </div>
                  )}

                  <button onClick={handleCheckFare} disabled={loading || !pickupCoords || !dropCoords}
                    className="btn-primary w-full py-3 text-base disabled:opacity-50">
                    {loading
                      ? <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-auto-dark border-t-transparent rounded-full animate-spin" />
                          Calculating…
                        </span>
                      : "💰 Check Fare"}
                  </button>
                </div>

                {/* Fare guide */}
                <div className="card bg-auto-dark text-white text-sm">
                  <h3 className="font-display font-bold mb-3 text-auto-yellow">💰 Fare Guide</h3>
                  <div className="space-y-2 text-gray-300">
                    <div className="flex justify-between"><span>Base</span><span className="font-bold text-white">₹20</span></div>
                    <div className="flex justify-between"><span>Per km</span><span className="font-bold text-white">₹12</span></div>
                    <div className="bg-white/10 rounded-lg p-2 text-xs mt-2">
                      5 km = ₹20 + (5 × ₹12) = <span className="font-bold text-auto-yellow">₹80</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Fare step */}
            {step === "fare" && fareData && (
              <div className="card animate-slide-up space-y-4">
                <div className="bg-gradient-to-br from-auto-dark to-auto-card text-white rounded-2xl p-5">
                  <p className="text-gray-400 text-xs font-bold mb-1 uppercase tracking-wide">Estimated Fare</p>
                  <p className="font-display font-bold text-5xl text-auto-yellow">₹{fareData.totalFare}</p>
                  <div className="border-t border-white/10 mt-3 pt-3 space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between"><span>Base</span><span>₹{fareData.baseFare}</span></div>
                    <div className="flex justify-between"><span>{fareData.distanceKm} km × ₹{fareData.ratePerKm}</span><span>₹{fareData.totalFare - fareData.baseFare}</span></div>
                    <div className="flex justify-between font-bold text-white border-t border-white/10 pt-1"><span>Total</span><span className="text-auto-yellow">₹{fareData.totalFare}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                  <div className="flex items-center gap-2"><span className="text-green-500">📍</span><span className="font-semibold truncate">{fareData.pickupLocation}</span></div>
                  <div className="ml-3 h-3 border-l-2 border-dashed border-gray-300" />
                  <div className="flex items-center gap-2"><span className="text-red-500">🏁</span><span className="font-semibold truncate">{fareData.dropLocation}</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={resetAll} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:border-gray-400 transition-all text-sm">← Change</button>
                  <button onClick={handleBook} disabled={booking} className="flex-1 btn-primary py-3 text-base disabled:opacity-60">
                    {booking ? "⏳ Booking…" : "🛺 Book Now!"}
                  </button>
                </div>
              </div>
            )}

            {/* Booked step */}
            {step === "booked" && (
              <div className="card text-center animate-slide-up">
                <span className="text-6xl block mb-3">✅</span>
                <h2 className="section-title mb-2">Ride Booked!</h2>
                <p className="text-gray-500 text-sm">Redirecting to ride tracker…</p>
                <div className="mt-4 flex justify-center">
                  <div className="w-8 h-8 border-4 border-auto-yellow border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* ── Right: map ─────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="card p-2">
              <div className="flex items-center justify-between px-2 pb-2">
                <h3 className="font-display font-bold text-auto-dark">🗺️ Pick on Map</h3>
                <div className="flex gap-1.5 text-xs">
                  <span className={`px-2 py-1 rounded-lg font-bold ${pickupCoords ? "bg-green-100 text-green-700":"bg-gray-100 text-gray-400"}`}>📍 Pickup</span>
                  <span className={`px-2 py-1 rounded-lg font-bold ${dropCoords   ? "bg-red-100 text-red-600"  :"bg-gray-100 text-gray-400"}`}>🏁 Drop</span>
                </div>
              </div>
              <MapView
                mode="picker"
                pickupCoords={pickupCoords}
                dropCoords={dropCoords}
                onPickupSelect={handlePickupSelect}
                onDropSelect={handleDropSelect}
                height="500px"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
