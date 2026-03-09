const express = require("express");
const router  = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { generateOTP, getOTP, verifyOTP, regenerateOTP } = require("../controllers/otpController");

// POST /api/otp/generate/:rideId  — driver calls this after accepting
router.post("/generate/:rideId",    protect, authorizeRoles("driver"), generateOTP);

// GET  /api/otp/:rideId            — user sees their OTP on screen
router.get("/:rideId",              protect, authorizeRoles("user"),   getOTP);

// POST /api/otp/verify/:rideId     — driver enters OTP to start ride
router.post("/verify/:rideId",      protect, authorizeRoles("driver"), verifyOTP);

// POST /api/otp/regenerate/:rideId — user refreshes their OTP
router.post("/regenerate/:rideId",  protect, authorizeRoles("user"),   regenerateOTP);

module.exports = router;
