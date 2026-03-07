const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMyProfile,
  updateDriverStatus,
} = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// POST /api/auth/register  → Register user or driver
router.post("/register", registerUser);

// POST /api/auth/login     → Login
router.post("/login", loginUser);

// GET  /api/auth/me        → Get my profile (protected)
router.get("/me", protect, getMyProfile);

// PUT  /api/auth/driver/status → Driver goes online/offline
router.put("/driver/status", protect, authorizeRoles("driver"), updateDriverStatus);

module.exports = router;
