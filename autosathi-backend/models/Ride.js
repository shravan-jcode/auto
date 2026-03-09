const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    pickupLocation: { type: String, required: [true, "Pickup location is required"], trim: true },
    dropLocation:   { type: String, required: [true, "Drop location is required"],   trim: true },

    // ─── Map Coordinates ──────────────────────────────────
    pickupCoords: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    dropCoords:   { lat: { type: Number, default: null }, lng: { type: Number, default: null } },

    // ─── Fare ─────────────────────────────────────────────
    distanceKm: { type: Number, default: 0 },
    fare: { type: Number, required: [true, "Fare is required"], default: 0 },

    // ─── Status ───────────────────────────────────────────
    // pending → accepted → otp_pending → ongoing → completed
    status: {
      type: String,
      enum: ["pending", "accepted", "otp_pending", "ongoing", "completed", "cancelled"],
      default: "pending",
    },

    // ─── OTP (no SMS needed — shown on screen) ────────────
    // Flow: driver accepts → OTP auto-generated → shown to USER on their screen
    //       driver reaches user → user shows OTP → driver enters it → ride starts
    otp: {
      code:       { type: String,  default: null },   // 6-digit code
      expiresAt:  { type: Date,    default: null },   // valid 15 min
      verified:   { type: Boolean, default: false },  // true after driver enters it
      attempts:   { type: Number,  default: 0 },      // wrong attempts counter
    },

    // ─── Driver Live Location ─────────────────────────────
    driverLocation: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },

    // ─── Timestamps ───────────────────────────────────────
    acceptedAt:  { type: Date, default: null },
    startedAt:   { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    // ─── Rating ───────────────────────────────────────────
    rating:        { type: Number, min: 1, max: 5, default: null },
    ratingComment: { type: String, default: null },
    ratedAt:       { type: Date,   default: null },

    // ─── Cancel ───────────────────────────────────────────
    cancelReason: { type: String, default: null },

    // ─── Payment (Razorpay) ───────────────────────────────
    payment: {
      status: {
        type: String,
        enum: ["unpaid", "pending", "paid", "failed", "refunded"],
        default: "unpaid",
      },
      method: { type: String, enum: ["online", "cash", null], default: null },
      razorpayOrderId:   { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
      razorpaySignature: { type: String, default: null },
      paidAt: { type: Date,   default: null },
      amount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);
