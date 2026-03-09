import React from "react";

// ─── Status Badge ─────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pending:   { bg: "bg-yellow-100 text-yellow-700",  icon: "⏳" },
    accepted:    { bg: "bg-blue-100 text-blue-700",    icon: "✅" },
    otp_pending: { bg: "bg-amber-100 text-amber-700", icon: "🔐" },
    ongoing:   { bg: "bg-green-100 text-green-700",    icon: "🚗" },
    completed: { bg: "bg-purple-100 text-purple-700",  icon: "🏁" },
    cancelled: { bg: "bg-red-100 text-red-500",        icon: "❌" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`status-badge ${s.bg}`}>
      {s.icon} {status}
    </span>
  );
}

// ─── Stat Card (for dashboards) ───────────────────────────
export function StatCard({ icon, label, value, color = "yellow" }) {
  const colors = {
    yellow: "border-auto-yellow bg-yellow-50",
    blue:   "border-blue-400 bg-blue-50",
    green:  "border-green-400 bg-green-50",
    red:    "border-red-400 bg-red-50",
    purple: "border-purple-400 bg-purple-50",
  };
  return (
    <div className={`card border-l-4 ${colors[color]} flex items-center gap-4`}>
      <span className="text-4xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
        <p className="font-display font-bold text-3xl text-auto-dark">{value}</p>
      </div>
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────
export function Spinner({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 border-4 border-auto-yellow border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-semibold">{text}</p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────
export function EmptyState({ icon = "🛺", title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-6xl">{icon}</span>
      <h3 className="font-display font-bold text-xl text-gray-600">{title}</h3>
      {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
    </div>
  );
}

// ─── Toast Notification ───────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const colors = {
    success: "bg-green-500",
    error:   "bg-red-500",
    info:    "bg-blue-500",
    warning: "bg-yellow-500 text-auto-dark",
  };
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up max-w-sm`}>
      <span className="flex-1 font-semibold text-sm">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white text-lg">✕</button>
    </div>
  );
}

// ─── Star Rating Input ────────────────────────────────────
export function StarRating({ value, onChange, readOnly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange && onChange(star)}
          className={`text-2xl transition-transform ${
            readOnly ? "cursor-default" : "hover:scale-125 cursor-pointer"
          } ${star <= value ? "text-auto-yellow" : "text-gray-300"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Ride Info Card ───────────────────────────────────────
export function RideCard({ ride, actions }) {
  return (
    <div className="card hover:shadow-lg transition-all duration-200 animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-400 font-semibold mb-1">
            #{ride._id?.slice(-8).toUpperCase()}
          </p>
          <StatusBadge status={ride.status} />
        </div>
        <div className="text-right">
          <p className="font-display font-bold text-2xl text-auto-yellow">₹{ride.fare}</p>
          <p className="text-xs text-gray-400">{ride.distanceKm} km</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-green-500 text-lg mt-0.5">📍</span>
          <div>
            <p className="text-xs text-gray-400 font-semibold">PICKUP</p>
            <p className="font-semibold text-gray-700">{ride.pickupLocation}</p>
          </div>
        </div>
        <div className="border-l-2 border-dashed border-gray-200 ml-4 h-3"></div>
        <div className="flex items-start gap-2">
          <span className="text-red-500 text-lg mt-0.5">🏁</span>
          <div>
            <p className="text-xs text-gray-400 font-semibold">DROP</p>
            <p className="font-semibold text-gray-700">{ride.dropLocation}</p>
          </div>
        </div>
      </div>

      {/* Driver info */}
      {ride.driver && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">👨‍✈️</span>
          <div>
            <p className="font-bold text-auto-dark text-sm">{ride.driver.name}</p>
            <p className="text-xs text-gray-500">
              {ride.driver.vehicleNumber} · ⭐ {ride.driver.averageRating || "New"}
            </p>
          </div>
        </div>
      )}

      {/* Rating display */}
      {ride.rating && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Your rating:</span>
          <StarRating value={ride.rating} readOnly />
        </div>
      )}

      {/* Date */}
      <p className="text-xs text-gray-400 mb-4">
        🕐 {new Date(ride.createdAt).toLocaleString("en-IN")}
      </p>

      {/* Action buttons */}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
