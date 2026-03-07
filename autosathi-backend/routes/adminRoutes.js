const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getStats,
  getAllUsers,
  getAllDrivers,
  getAllRides,
  toggleBlockUser,
  deleteUser,
  adminCancelRide,
} = require("../controllers/adminController");

// All admin routes require login + admin role
router.use(protect, authorizeRoles("admin"));

// GET  /api/admin/stats          → Dashboard stats
router.get("/stats", getStats);

// GET  /api/admin/users          → All users
router.get("/users", getAllUsers);

// GET  /api/admin/drivers        → All drivers
router.get("/drivers", getAllDrivers);

// GET  /api/admin/rides          → All rides/bookings
router.get("/rides", getAllRides);

// PUT  /api/admin/users/:id/block  → Block or unblock user
router.put("/users/:id/block", toggleBlockUser);

// DELETE /api/admin/users/:id    → Delete user
router.delete("/users/:id", deleteUser);

// PUT  /api/admin/rides/:id/cancel → Admin cancels a ride
router.put("/rides/:id/cancel", adminCancelRide);

module.exports = router;
