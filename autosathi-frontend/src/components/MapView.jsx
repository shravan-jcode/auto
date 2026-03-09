import React, { useEffect, useRef, useState, useCallback } from "react";

/*
  MapView — Leaflet.js + OpenStreetMap
  ✅ 100% FREE — no API key, no account, no credit card
  ✅ Loaded from unpkg CDN (no npm install needed)
  ✅ Geocoding via Nominatim (OpenStreetMap's free geocoder)

  Props:
    mode:          "picker" | "route" | "tracking"
    pickupCoords   {lat, lng}  — existing pickup marker
    dropCoords     {lat, lng}  — existing drop marker
    driverCoords   {lat, lng}  — live driver position (tracking mode)
    onPickupSelect (coords, name) — called when user clicks pickup on map
    onDropSelect   (coords, name) — called when user clicks drop on map
    height         CSS string e.g. "400px"
    className      extra classes
*/

// ── Load Leaflet CSS+JS from CDN once globally ────────────
let _leafletReady = false;
let _leafletCallbacks = [];
const loadLeaflet = () =>
  new Promise((resolve) => {
    if (window.L) { resolve(); return; }
    if (_leafletReady) { _leafletCallbacks.push(resolve); return; }
    _leafletReady = true;

    const link  = document.createElement("link");
    link.rel    = "stylesheet";
    link.href   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script   = document.createElement("script");
    script.src     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload  = () => {
      _leafletCallbacks.forEach(cb => cb());
      _leafletCallbacks = [];
      resolve();
    };
    document.head.appendChild(script);
  });

// ── Reverse geocode (free, no key) ────────────────────────
export const reverseGeocode = async (lat, lng) => {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en-IN,en" } }
    );
    const d = await r.json();
    // Short display: area + city
    const parts = [
      d.address?.suburb || d.address?.neighbourhood || d.address?.village,
      d.address?.city || d.address?.town || d.address?.county,
      d.address?.state,
    ].filter(Boolean);
    return parts.slice(0, 3).join(", ") || d.display_name?.split(",").slice(0,3).join(", ") || `${lat.toFixed(4)},${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

// ── Forward geocode search ────────────────────────────────
export const searchPlaces = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=in`,
      { headers: { "Accept-Language": "en-IN,en" } }
    );
    const data = await r.json();
    return data.map(p => ({
      lat:  parseFloat(p.lat),
      lng:  parseFloat(p.lon),
      name: p.display_name?.split(",").slice(0,3).join(", ") || p.display_name,
    }));
  } catch { return []; }
};

// ── Haversine distance ────────────────────────────────────
export const calcDistKm = (a, b) => {
  if (!a?.lat || !b?.lat) return 0;
  const R  = 6371;
  const dL = ((b.lat - a.lat) * Math.PI) / 180;
  const dG = ((b.lng - a.lng) * Math.PI) / 180;
  const h  = Math.sin(dL/2)**2 +
             Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dG/2)**2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h))).toFixed(2));
};

// ── Custom marker HTML ────────────────────────────────────
const markerHtml = (emoji, color, label) =>
  `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
     <div style="background:${color};color:#fff;padding:4px 10px;border-radius:20px;
       font-size:11px;font-weight:700;white-space:nowrap;
       box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;gap:4px">
       ${emoji} ${label}
     </div>
     <div style="width:2px;height:8px;background:${color};opacity:.7"></div>
   </div>`;

export default function MapView({
  mode          = "picker",
  pickupCoords,
  dropCoords,
  driverCoords,
  onPickupSelect,
  onDropSelect,
  height        = "400px",
  className     = "",
}) {
  const divRef      = useRef(null);
  const mapRef      = useRef(null);
  const markersRef  = useRef({});
  const polyRef     = useRef(null);
  const [ready, setReady]       = useState(false);
  const [clickMode, setClickMode] = useState("pickup"); // "pickup" | "drop"

  // ── init map ─────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    loadLeaflet().then(() => {
      if (!alive || !divRef.current || mapRef.current) return;
      const L   = window.L;
      // Default center: India
      const map = L.map(divRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  // ── place / move a named marker ───────────────────────────
  const placeMarker = useCallback((name, lat, lng, emoji, color, label) => {
    if (!mapRef.current) return;
    const L    = window.L;
    const icon = L.divIcon({ className:"", html: markerHtml(emoji, color, label), iconAnchor:[0,0] });
    if (markersRef.current[name]) {
      markersRef.current[name].setLatLng([lat, lng]).setIcon(icon);
    } else {
      markersRef.current[name] = L.marker([lat, lng], { icon }).addTo(mapRef.current);
    }
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 14), { animate: true });
  }, []);

  // ── draw dashed route line between pickup & drop ─────────
  const drawRoute = useCallback(() => {
    if (!mapRef.current) return;
    const L  = window.L;
    const pk = markersRef.current.pickup?.getLatLng();
    const dr = markersRef.current.drop?.getLatLng();
    if (!pk || !dr) return;
    if (polyRef.current) mapRef.current.removeLayer(polyRef.current);
    polyRef.current = L.polyline([pk, dr], {
      color: "#FFB800", weight: 4, dashArray: "8,6", opacity: .9,
    }).addTo(mapRef.current);
    mapRef.current.fitBounds(L.latLngBounds([pk, dr]), { padding:[50,50] });
  }, []);

  // ── react to external coord props ────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (pickupCoords?.lat) placeMarker("pickup", pickupCoords.lat, pickupCoords.lng, "📍","#22c55e","Pickup");
    if (dropCoords?.lat)   placeMarker("drop",   dropCoords.lat,   dropCoords.lng,   "🏁","#ef4444","Drop");
    if (pickupCoords?.lat && dropCoords?.lat) drawRoute();
  }, [ready, pickupCoords?.lat, pickupCoords?.lng, dropCoords?.lat, dropCoords?.lng, placeMarker, drawRoute]);

  // ── driver live tracking marker ───────────────────────────
  useEffect(() => {
    if (!ready || !driverCoords?.lat) return;
    const L    = window.L;
    const icon = L.divIcon({
      className: "",
      html: `<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.4))">🛺</div>`,
      iconAnchor: [14, 14],
    });
    if (markersRef.current.driver) {
      markersRef.current.driver.setLatLng([driverCoords.lat, driverCoords.lng]);
    } else {
      markersRef.current.driver = L.marker([driverCoords.lat, driverCoords.lng], { icon })
        .bindPopup("🛺 Driver").addTo(mapRef.current);
    }
    if (mode === "tracking") {
      mapRef.current.panTo([driverCoords.lat, driverCoords.lng], { animate:true, duration:1 });
    }
  }, [ready, driverCoords?.lat, driverCoords?.lng, mode]);

  // ── click to pick locations (picker mode) ────────────────
  useEffect(() => {
    if (!ready || mode !== "picker") return;
    const map = mapRef.current;

    const handler = async (e) => {
      const { lat, lng } = e.latlng;
      const name = await reverseGeocode(lat, lng);
      if (clickMode === "pickup") {
        placeMarker("pickup", lat, lng, "📍", "#22c55e", "Pickup");
        onPickupSelect?.({ lat, lng }, name);
        setClickMode("drop");
      } else {
        placeMarker("drop", lat, lng, "🏁", "#ef4444", "Drop");
        onDropSelect?.({ lat, lng }, name);
        setClickMode("pickup");
        // draw route after drop set
        setTimeout(drawRoute, 100);
      }
    };

    map.on("click", handler);
    return () => map.off("click", handler);
  }, [ready, mode, clickMode, placeMarker, drawRoute, onPickupSelect, onDropSelect]);

  // ── remove a marker ───────────────────────────────────────
  const removeMarker = (name) => {
    if (markersRef.current[name]) {
      mapRef.current.removeLayer(markersRef.current[name]);
      delete markersRef.current[name];
    }
    if (polyRef.current) { mapRef.current.removeLayer(polyRef.current); polyRef.current = null; }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm ${className}`} style={{ height }}>
      <div ref={divRef} style={{ width:"100%", height:"100%" }} />

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 border-4 border-auto-yellow border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-semibold">Loading map…</p>
        </div>
      )}

      {/* Picker instructions */}
      {mode === "picker" && ready && (
        <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
          {!pickupCoords?.lat ? (
            <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg text-center animate-pulse mx-auto w-fit">
              📍 Click map to set PICKUP
            </div>
          ) : !dropCoords?.lat ? (
            <div className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg text-center animate-pulse mx-auto w-fit">
              🏁 Now click map to set DROP
            </div>
          ) : (
            <div className="bg-auto-yellow text-auto-dark text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg text-center mx-auto w-fit">
              ✅ Route set! You can adjust by clicking again.
            </div>
          )}
        </div>
      )}

      {/* Reset buttons (picker mode) */}
      {mode === "picker" && ready && (pickupCoords?.lat || dropCoords?.lat) && (
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
          {pickupCoords?.lat && (
            <button onClick={() => { removeMarker("pickup"); onPickupSelect?.(null,""); setClickMode("pickup"); }}
              className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-green-700 transition-all">
              ✕ Reset Pickup
            </button>
          )}
          {dropCoords?.lat && (
            <button onClick={() => { removeMarker("drop"); onDropSelect?.(null,""); }}
              className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-red-600 transition-all">
              ✕ Reset Drop
            </button>
          )}
        </div>
      )}

      {/* Live badge (tracking mode) */}
      {mode === "tracking" && driverCoords?.lat && (
        <div className="absolute top-3 right-3 z-[1000]">
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-ping inline-block"/>Live
          </span>
        </div>
      )}
    </div>
  );
}
