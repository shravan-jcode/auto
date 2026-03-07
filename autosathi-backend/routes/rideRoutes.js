const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getFare,
  createRide,
  getPendingRides,
  getUserRides,
  getDriverRides,
  getRideById,
  acceptRide,
  startRide,
  completeRide,
  cancelRide,
  rateDriver,
  updateDriverLocation,
} = require("../controllers/rideController");

// ─── Fare Calculator (before booking) ────────────────────
// POST /api/rides/fare  → Calculate fare
router.post("/fare", protect, authorizeRoles("user"), getFare);

// ─── Create Ride (User books) ─────────────────────────────
// POST /api/rides       → Book a new ride
router.post("/", protect, authorizeRoles("user"), createRide);

// ─── Get Rides ────────────────────────────────────────────
// GET  /api/rides/pending      → Driver sees available rides
router.get("/pending", protect, authorizeRoles("driver"), getPendingRides);

// GET  /api/rides/my           → User sees booking history
router.get("/my", protect, authorizeRoles("user"), getUserRides);

// GET  /api/rides/driver/history → Driver sees their ride history
router.get("/driver/history", protect, authorizeRoles("driver"), getDriverRides);

// GET  /api/rides/:id          → Get single ride details
router.get("/:id", protect, getRideById);

// ─── Ride Status Flow ─────────────────────────────────────
// PUT /api/rides/:id/accept   → Driver accepts ride
router.put("/:id/accept", protect, authorizeRoles("driver"), acceptRide);

// PUT /api/rides/:id/start    → Driver starts ride
router.put("/:id/start", protect, authorizeRoles("driver"), startRide);

// PUT /api/rides/:id/complete → Driver completes ride
router.put("/:id/complete", protect, authorizeRoles("driver"), completeRide);

// PUT /api/rides/:id/cancel   → User or Driver cancels ride
router.put("/:id/cancel", protect, cancelRide);

// ─── Rating & Location ────────────────────────────────────
// PUT /api/rides/:id/rate     → User rates driver after completion
router.put("/:id/rate", protect, authorizeRoles("user"), rateDriver);

// PUT /api/rides/:id/location → Driver updates live location
router.put("/:id/location", protect, authorizeRoles("driver"), updateDriverLocation);

module.exports = router;
