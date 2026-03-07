const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    pickupLocation: {
      type: String,
      required: [true, "Pickup location is required"],
      trim: true,
    },

    dropLocation: {
      type: String,
      required: [true, "Drop location is required"],
      trim: true,
    },

    // ─── Fare Details ─────────────────────────────────────
    distanceKm: {
      type: Number,
      default: 0,
    },

    fare: {
      type: Number,
      required: [true, "Fare is required"],
      default: 0,
    },

    // ─── Ride Status ──────────────────────────────────────
    // pending → accepted → ongoing → completed
    // or pending → cancelled
    status: {
      type: String,
      enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
      default: "pending",
    },

    // ─── Driver Location (for live tracking) ─────────────
    driverLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    // ─── Timestamps for each status ──────────────────────
    acceptedAt: { type: Date, default: null },
    startedAt:  { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    // ─── Rating (user gives rating after ride) ────────────
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    ratingComment: {
      type: String,
      default: null,
    },

    ratedAt: {
      type: Date,
      default: null,
    },

    // ─── Cancellation reason ─────────────────────────────
    cancelReason: {
      type: String,
      default: null,
    },

    // ─── Payment (Razorpay) ───────────────────────────────
    payment: {
      status: {
        type: String,
        enum: ["unpaid", "pending", "paid", "failed", "refunded"],
        default: "unpaid",
      },
      method: {
        type: String,
        enum: ["online", "cash", null],
        default: null,
      },
      // Razorpay order created before payment
      razorpayOrderId: { type: String, default: null },
      // Razorpay payment ID returned after success
      razorpayPaymentId: { type: String, default: null },
      // Razorpay signature for verification
      razorpaySignature: { type: String, default: null },
      paidAt: { type: Date, default: null },
      amount: { type: Number, default: 0 }, // in rupees
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);
