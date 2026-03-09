import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("autosathi_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────
export const registerUser  = (data) => API.post("/auth/register", data);
export const loginUser     = (data) => API.post("/auth/login", data);
export const getMyProfile  = ()     => API.get("/auth/me");
export const setDriverStatus = (isOnline) => API.put("/auth/driver/status", { isOnline });

// ── Rides ─────────────────────────────────────────────
export const calcFare        = (data)  => API.post("/rides/fare", data);
export const bookRide        = (data)  => API.post("/rides", data);
export const getMyRides      = ()      => API.get("/rides/my");
export const getPendingRides = ()      => API.get("/rides/pending");
export const getDriverHistory = ()     => API.get("/rides/driver/history");
export const getRideById     = (id)    => API.get(`/rides/${id}`);
export const acceptRide      = (id)    => API.put(`/rides/${id}/accept`);
export const startRide       = (id)    => API.put(`/rides/${id}/start`);
export const completeRide    = (id)    => API.put(`/rides/${id}/complete`);
export const cancelRide      = (id, reason) => API.put(`/rides/${id}/cancel`, { reason });
export const rateDriver      = (id, rating, comment) => API.put(`/rides/${id}/rate`, { rating, comment });

// ── Payment ───────────────────────────────────────────
export const createPaymentOrder  = (rideId)  => API.post("/payment/create-order", { rideId });
export const verifyPayment       = (data)    => API.post("/payment/verify", data);
export const payCash             = (rideId)  => API.post("/payment/cash", { rideId });
export const getPaymentStatus    = (rideId)  => API.get(`/payment/status/${rideId}`);

// ── Admin ─────────────────────────────────────────────
export const getAdminStats  = ()     => API.get("/admin/stats");
export const getAllUsers     = ()     => API.get("/admin/users");
export const getAllDrivers   = ()     => API.get("/admin/drivers");
export const getAllRides     = ()     => API.get("/admin/rides");
export const blockUser       = (id, isBlocked) => API.put(`/admin/users/${id}/block`, { isBlocked });
export const deleteUser      = (id)  => API.delete(`/admin/users/${id}`);
export const adminCancelRide = (id, reason) => API.put(`/admin/rides/${id}/cancel`, { reason });

export default API;

// ── OTP (no SMS — shown on screen, zero account needed) ───
export const generateOTP    = (rideId)      => API.post(`/otp/generate/${rideId}`);
export const getOTP         = (rideId)      => API.get(`/otp/${rideId}`);
export const verifyOTP      = (rideId, otp) => API.post(`/otp/verify/${rideId}`, { otp });
export const regenerateOTP  = (rideId)      => API.post(`/otp/regenerate/${rideId}`);
