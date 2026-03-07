import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginUser, registerUser } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Toast } from "../components/UI";

// ══════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUser(form);
      login(res.data.token, res.data.user);
      const role = res.data.user.role;
      navigate(role === "driver" ? "/driver" : role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Login failed", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-auto-dark flex items-center justify-center px-4 py-12">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-6xl block mb-3">🛺</span>
          <h1 className="font-display font-bold text-3xl text-white mb-2">
            Welcome Back to <span className="text-auto-yellow">AutoSathi</span>
          </h1>
          <p className="text-gray-400">Login to book your ride</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2">📧 Email</label>
              <input
                type="email"
                placeholder="yourname@gmail.com"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2">🔐 Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center justify-center text-lg py-4 disabled:opacity-60">
              {loading ? "⏳ Logging in..." : "Login →"}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-500 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-auto-yellow font-bold hover:underline">
              Sign Up
            </Link>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-gray-500">
            <p className="font-bold text-gray-600 mb-1">🔑 Demo Tip</p>
            <p>Register first, then login with your credentials.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// REGISTER PAGE
// ══════════════════════════════════════════
export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") || "user";

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    role: defaultRole, vehicleNumber: "", vehicleColor: "",
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role !== "driver") {
        delete payload.vehicleNumber;
        delete payload.vehicleColor;
      }
      const res = await registerUser(payload);
      login(res.data.token, res.data.user);
      navigate(form.role === "driver" ? "/driver" : "/dashboard");
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Registration failed", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-auto-dark flex items-center justify-center px-4 py-12">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="w-full max-w-lg animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-6xl block mb-3">🛺</span>
          <h1 className="font-display font-bold text-3xl text-white mb-2">
            Join <span className="text-auto-yellow">AutoSathi</span>
          </h1>
          <p className="text-gray-400">Create your account and start riding</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Role Toggle */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            {["user", "driver"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, role: r })}
                className={`flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all ${
                  form.role === r
                    ? "bg-auto-dark text-white shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                {r === "user" ? "🧑 I'm a Rider" : "🚕 I'm a Driver"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-600 mb-1">👤 Full Name</label>
                <input
                  type="text" placeholder="Ramesh Kumar"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-600 mb-1">📧 Email</label>
                <input
                  type="email" placeholder="ramesh@gmail.com"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">📞 Phone</label>
                <input
                  type="tel" placeholder="9876543210"
                  className="input-field"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">🔐 Password</label>
                <input
                  type="password" placeholder="Min 6 characters"
                  className="input-field"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required minLength={6}
                />
              </div>

              {/* Driver fields */}
              {form.role === "driver" && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">🚕 Vehicle Number</label>
                    <input
                      type="text" placeholder="MH12AB1234"
                      className="input-field uppercase"
                      value={form.vehicleNumber}
                      onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">🎨 Vehicle Color</label>
                    <input
                      type="text" placeholder="Yellow"
                      className="input-field"
                      value={form.vehicleColor}
                      onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center text-lg py-4 disabled:opacity-60 mt-2">
              {loading ? "⏳ Creating Account..." : "Create Account 🎉"}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-500 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-auto-yellow font-bold hover:underline">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
