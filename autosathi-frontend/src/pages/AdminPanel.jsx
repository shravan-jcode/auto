import React, { useState, useEffect } from "react";
import {
  getAdminStats, getAllUsers, getAllDrivers, getAllRides,
  blockUser, deleteUser, adminCancelRide
} from "../utils/api";
import { Spinner, EmptyState, Toast, StatusBadge, StatCard } from "../components/UI";

export default function AdminPanel() {
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("overview");
  const [toast, setToast]     = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = async () => {
    try {
      const [s, u, d, r] = await Promise.all([
        getAdminStats(), getAllUsers(), getAllDrivers(), getAllRides()
      ]);
      setStats(s.data);
      setUsers(u.data.users);
      setDrivers(d.data.drivers);
      setRides(r.data.rides);
    } catch {
      showToast("Failed to load admin data", "error");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleBlock = async (id, isBlocked) => {
    try {
      await blockUser(id, isBlocked);
      showToast(isBlocked ? "User blocked" : "User unblocked", "warning");
      fetchAll();
    } catch {
      showToast("Failed to update user", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await deleteUser(id);
      showToast("User deleted", "warning");
      fetchAll();
    } catch {
      showToast("Failed to delete user", "error");
    }
  };

  const handleCancelRide = async (id) => {
    if (!window.confirm("Cancel this ride?")) return;
    try {
      await adminCancelRide(id, "Cancelled by admin");
      showToast("Ride cancelled", "warning");
      fetchAll();
    } catch {
      showToast("Failed to cancel ride", "error");
    }
  };

  const tabs = ["overview", "users", "drivers", "rides"];

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="font-display font-bold text-3xl">
            ⚙️ Admin <span className="text-auto-yellow">Panel</span>
          </h1>
          <p className="text-gray-400">Manage users, drivers and bookings</p>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl font-display font-bold capitalize transition-all ${
                tab === t
                  ? "bg-auto-yellow text-auto-dark shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-yellow-50"
              }`}>
              {t === "overview" ? "📊 Overview" :
               t === "users" ? `👥 Users (${users.length})` :
               t === "drivers" ? `🚕 Drivers (${drivers.length})` :
               `🛺 Rides (${rides.length})`}
            </button>
          ))}
        </div>

        {loading ? <Spinner text="Loading admin data..." /> : (
          <>
            {/* Overview Tab */}
            {tab === "overview" && stats && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard icon="👥" label="Total Users"    value={stats.totalUsers}     color="blue" />
                  <StatCard icon="🚕" label="Total Drivers"  value={stats.totalDrivers}   color="yellow" />
                  <StatCard icon="🛺" label="Total Rides"    value={stats.totalRides}     color="purple" />
                  <StatCard icon="✅" label="Completed"      value={stats.completedRides} color="green" />
                  <StatCard icon="⏳" label="Pending"        value={stats.pendingRides}   color="yellow" />
                  <StatCard icon="💰" label="Revenue (Paid)" value={`₹${rides.filter(r => r.payment?.status === "paid").reduce((s, r) => s + r.fare, 0)}`} color="green" />
                </div>

                {/* Recent Rides */}
                <div className="card">
                  <h3 className="section-title mb-4">🕐 Recent Rides</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 px-3 font-bold text-gray-500">ID</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-500">User</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-500">Route</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-500">Fare</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rides.slice(0, 8).map((r) => (
                          <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono text-xs text-gray-400">
                              #{r._id?.slice(-6)}
                            </td>
                            <td className="py-2 px-3 font-semibold">{r.user?.name || "N/A"}</td>
                            <td className="py-2 px-3 text-gray-500 max-w-xs truncate">
                              {r.pickupLocation} → {r.dropLocation}
                            </td>
                            <td className="py-2 px-3 font-bold text-auto-yellow">₹{r.fare}</td>
                            <td className="py-2 px-3"><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {tab === "users" && (
              <div className="animate-fade-in">
                {users.length === 0 ? <EmptyState icon="👥" title="No users yet" /> : (
                  <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-bold text-gray-500">Name</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-500">Email</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-500">Phone</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-500">Status</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 font-semibold">{u.name}</td>
                            <td className="py-3 px-4 text-gray-500">{u.email}</td>
                            <td className="py-3 px-4">{u.phone}</td>
                            <td className="py-3 px-4">
                              <span className={`status-badge ${
                                u.isBlocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                              }`}>
                                {u.isBlocked ? "🚫 Blocked" : "✅ Active"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleBlock(u._id, !u.isBlocked)}
                                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                                    u.isBlocked
                                      ? "bg-green-100 text-green-600 hover:bg-green-200"
                                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                  }`}>
                                  {u.isBlocked ? "Unblock" : "Block"}
                                </button>
                                <button
                                  onClick={() => handleDelete(u._id)}
                                  className="text-xs font-bold px-3 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Drivers Tab */}
            {tab === "drivers" && (
              <div className="animate-fade-in">
                {drivers.length === 0 ? <EmptyState icon="🚕" title="No drivers yet" /> : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {drivers.map((d) => (
                      <div key={d._id} className="card hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-auto-yellow/20 rounded-full flex items-center justify-center text-2xl">
                              🚕
                            </div>
                            <div>
                              <p className="font-bold text-auto-dark">{d.name}</p>
                              <p className="text-sm text-gray-500">{d.email}</p>
                            </div>
                          </div>
                          <span className={`status-badge ${
                            d.isOnline ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                          }`}>
                            {d.isOnline ? "🟢 Online" : "⚫ Offline"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          <span>📞 {d.phone}</span>
                          <span>🚕 {d.vehicleNumber}</span>
                          <span>⭐ {d.averageRating || "No rating"}</span>
                          <span>🎨 {d.vehicleColor || "N/A"}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBlock(d._id, !d.isBlocked)}
                            className={`flex-1 text-sm font-bold py-2 rounded-xl transition-all ${
                              d.isBlocked
                                ? "bg-green-100 text-green-600 hover:bg-green-200"
                                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            }`}>
                            {d.isBlocked ? "Unblock" : "Block"}
                          </button>
                          <button
                            onClick={() => handleDelete(d._id)}
                            className="flex-1 text-sm font-bold py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rides Tab */}
            {tab === "rides" && (
              <div className="animate-fade-in">
                {rides.length === 0 ? <EmptyState icon="🛺" title="No rides yet" /> : (
                  <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-3 font-bold text-gray-500">ID</th>
                          <th className="text-left py-3 px-3 font-bold text-gray-500">User</th>
                          <th className="text-left py-3 px-3 font-bold text-gray-500">Driver</th>
                          <th className="text-left py-3 px-3 font-bold text-gray-500">From → To</th>
                          <th className="text-left py-3 px-3 font-bold text-gray-500">Fare</th>
                          <th className="text-left py-3 px-3 font-bold text-gray-500">Status</th>
                          <th className="text-left py-3 px-3 font-bold text-gray-500">Payment</th>
                          <th className="text-left py-3 px-3 font-bold text-gray-500">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rides.map((r) => (
                          <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono text-xs text-gray-400">#{r._id?.slice(-6)}</td>
                            <td className="py-2 px-3 font-semibold">{r.user?.name || "N/A"}</td>
                            <td className="py-2 px-3">{r.driver?.name || "—"}</td>
                            <td className="py-2 px-3 text-gray-500 max-w-48 truncate text-xs">
                              {r.pickupLocation} → {r.dropLocation}
                            </td>
                            <td className="py-2 px-3 font-bold text-auto-yellow">₹{r.fare}</td>
                            <td className="py-2 px-3"><StatusBadge status={r.status} /></td>
                            <td className="py-2 px-3">
                              <span className={`status-badge text-xs ${
                                r.payment?.status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-500"
                              }`}>
                                {r.payment?.status === "paid"
                                  ? `✅ ${r.payment.method}`
                                  : "⏳ Unpaid"}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {["pending", "accepted", "ongoing"].includes(r.status) && (
                                <button
                                  onClick={() => handleCancelRide(r._id)}
                                  className="text-xs font-bold px-3 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all">
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
