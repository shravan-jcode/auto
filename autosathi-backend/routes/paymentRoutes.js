const express = require("express");
const router  = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createOrder,
  verifyPayment,
  payCash,
  getPaymentStatus,
  webhook,
} = require("../controllers/paymentController");

// POST /api/payment/create-order  → Create Razorpay order for a completed ride
router.post("/create-order", protect, authorizeRoles("user"), createOrder);

// POST /api/payment/verify        → Verify payment signature & mark ride paid
router.post("/verify", protect, authorizeRoles("user"), verifyPayment);

// POST /api/payment/cash          → Mark ride as cash paid (no Razorpay)
router.post("/cash", protect, authorizeRoles("user"), payCash);

// GET  /api/payment/status/:rideId → Check payment status of a ride
router.get("/status/:rideId", protect, getPaymentStatus);

// POST /api/payment/webhook       → Razorpay webhook (no auth, Razorpay calls this)
router.post("/webhook", express.raw({ type: "application/json" }), webhook);

module.exports = router;
