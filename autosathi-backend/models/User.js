const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["user", "driver", "admin"],
      default: "user",
    },

    // ─── Driver-Only Fields ───────────────────────────────
    isOnline: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    vehicleNumber: {
      type: String,
      default: null,
    },

    vehicleColor: {
      type: String,
      default: null,
    },

    vehicleType: {
      type: String,
      default: "Auto Rickshaw",
    },

    // ─── Rating Fields ────────────────────────────────────
    totalRating: {
      type: Number,
      default: 0,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },

    // Computed average rating (stored for quick access)
    averageRating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ─── Hash Password Before Save ────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ─── Compare Password Method ──────────────────────────────
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ─── Update Average Rating Method ────────────────────────
userSchema.methods.addRating = function (stars) {
  this.totalRating += stars;
  this.ratingCount += 1;
  this.averageRating = parseFloat(
    (this.totalRating / this.ratingCount).toFixed(1)
  );
};

module.exports = mongoose.model("User", userSchema);
