import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { setDriverStatus } from "../utils/api";

export default function Navbar() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const toggleOnline = async () => {
    setToggling(true);
    try {
      const res = await setDriverStatus(!user.isOnline);
      setUser({ ...user, isOnline: res.data.isOnline });
    } catch (e) {}
    setToggling(false);
  };

  return (
    <nav className="bg-auto-dark text-white shadow-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-3xl">🛺</span>
          <span className="font-display font-bold text-xl">
            Auto<span className="text-auto-yellow">Sathi</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/login"
                className="px-5 py-2 rounded-xl font-semibold hover:bg-white/10 transition">
                Login
              </Link>
              <Link to="/register"
                className="btn-primary text-sm px-5 py-2">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              {user.role === "user" && (
                <>
                  <Link to="/dashboard" className="nav-link text-white hover:text-auto-yellow">
                    🏠 Dashboard
                  </Link>
                  <Link to="/history" className="nav-link text-white hover:text-auto-yellow">
                    📜 History
                  </Link>
                </>
              )}
              {user.role === "driver" && (
                <>
                  <Link to="/driver" className="nav-link text-white hover:text-auto-yellow">
                    🚕 Rides
                  </Link>
                  <button
                    onClick={toggleOnline}
                    disabled={toggling}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      user.isOnline
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-500 text-white hover:bg-gray-600"
                    }`}>
                    {toggling ? "..." : user.isOnline ? "🟢 Online" : "⚫ Offline"}
                  </button>
                </>
              )}
              {user.role === "admin" && (
                <Link to="/admin" className="nav-link text-white hover:text-auto-yellow">
                  ⚙️ Admin
                </Link>
              )}

              {/* User info */}
              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-white/20">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-xs text-auto-yellow capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-auto-card border-t border-white/10 px-4 py-4 space-y-2 animate-fade-in">
          {!user ? (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="block py-2 px-4 rounded-xl hover:bg-white/10">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}
                className="block py-2 px-4 rounded-xl bg-auto-yellow text-auto-dark font-bold text-center">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              {user.role === "user" && <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                  className="block py-2 px-4 rounded-xl hover:bg-white/10">🏠 Dashboard</Link>
                <Link to="/history" onClick={() => setMenuOpen(false)}
                  className="block py-2 px-4 rounded-xl hover:bg-white/10">📜 History</Link>
              </>}
              {user.role === "driver" && <>
                <Link to="/driver" onClick={() => setMenuOpen(false)}
                  className="block py-2 px-4 rounded-xl hover:bg-white/10">🚕 Rides</Link>
              </>}
              {user.role === "admin" && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}
                  className="block py-2 px-4 rounded-xl hover:bg-white/10">⚙️ Admin</Link>
              )}
              <button onClick={handleLogout}
                className="block w-full text-left py-2 px-4 rounded-xl bg-red-500/20 text-red-300">
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
