const crypto = require("crypto");   // built-in Node.js — zero install
const Ride   = require("../models/Ride");

// ─── Generate secure 6-digit OTP ──────────────────────────
const makeOTP = () => {
  // Use crypto.randomInt for unbiased random — no external package needed
  return String(crypto.randomInt(100000, 999999));
};

/* ══════════════════════════════════════════════════════════
   GENERATE OTP
   POST /api/otp/generate/:rideId
   Protected — driver only

   Called automatically when driver accepts ride.
   OTP is stored in DB and returned to the USER's screen (not SMS).
   User shows OTP to driver at pickup → driver types it to start ride.
══════════════════════════════════════════════════════════ */
const generateOTP = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate("user", "name phone");

    if (!ride) return res.status(404).json({ message: "Ride not found." });

    if (!ride.driver || ride.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "You are not the driver of this ride." });

    if (!["accepted", "otp_pending"].includes(ride.status))
      return res.status(400).json({ message: "OTP can only be generated for accepted rides." });

    const code      = makeOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    ride.otp    = { code, expiresAt, verified: false, attempts: 0 };
    ride.status = "otp_pending";
    await ride.save();

    // Return OTP in response — frontend shows it on USER's screen
    res.json({
      message: "OTP generated. Show this to your driver at pickup.",
      otp:        code,         // displayed on user screen
      expiresAt,
      rideId: ride._id,
    });

  } catch (err) {
    console.error("GENERATE OTP:", err);
    res.status(500).json({ message: "Failed to generate OTP." });
  }
};

/* ══════════════════════════════════════════════════════════
   GET OTP (for user to see their OTP again)
   GET /api/otp/:rideId
   Protected — user only
══════════════════════════════════════════════════════════ */
const getOTP = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found." });

    if (ride.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized." });

    if (!ride.otp?.code)
      return res.status(400).json({ message: "No OTP generated yet." });

    // Check if expired
    const expired = new Date() > new Date(ride.otp.expiresAt);

    res.json({
      otp:        expired ? null : ride.otp.code,
      verified:   ride.otp.verified,
      expiresAt:  ride.otp.expiresAt,
      expired,
    });

  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════════════════════
   VERIFY OTP + START RIDE
   POST /api/otp/verify/:rideId
   Protected — driver only
   Body: { otp: "123456" }
══════════════════════════════════════════════════════════ */
const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required." });

    const ride = await Ride.findById(req.params.rideId)
      .populate("user",   "name phone")
      .populate("driver", "name phone vehicleNumber");

    if (!ride) return res.status(404).json({ message: "Ride not found." });

    if (!ride.driver || ride.driver._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "You are not the driver of this ride." });

    if (ride.status !== "otp_pending")
      return res.status(400).json({ message: "Ride is not waiting for OTP verification." });

    if (!ride.otp?.code)
      return res.status(400).json({ message: "No OTP found. Generate one first." });

    // Max 5 attempts
    if (ride.otp.attempts >= 5)
      return res.status(400).json({ message: "Too many wrong attempts. Please regenerate OTP." });

    // Check expiry
    if (new Date() > new Date(ride.otp.expiresAt)) {
      return res.status(400).json({ message: "OTP has expired. Ask the passenger to regenerate." });
    }

    // Check match (timing-safe comparison)
    const inputBuf  = Buffer.from(String(otp).trim());
    const correctBuf = Buffer.from(ride.otp.code);
    const match = inputBuf.length === correctBuf.length &&
                  crypto.timingSafeEqual(inputBuf, correctBuf);

    if (!match) {
      ride.otp.attempts += 1;
      await ride.save();
      const left = 5 - ride.otp.attempts;
      return res.status(400).json({
        message: `Wrong OTP. ${left} attempt${left !== 1 ? "s" : ""} remaining.`,
        attemptsLeft: left,
      });
    }

    // ✅ Correct — start the ride
    ride.otp.verified = true;
    ride.status       = "ongoing";
    ride.startedAt    = new Date();
    await ride.save();

    res.json({
      message: "✅ OTP verified! Ride has started. Have a safe journey 🚗",
      ride,
    });

  } catch (err) {
    console.error("VERIFY OTP:", err);
    res.status(500).json({ message: "OTP verification failed." });
  }
};

/* ══════════════════════════════════════════════════════════
   REGENERATE OTP (if expired or user requests refresh)
   POST /api/otp/regenerate/:rideId
   Protected — user only (they request fresh OTP)
══════════════════════════════════════════════════════════ */
const regenerateOTP = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found." });

    if (ride.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized." });

    if (ride.status !== "otp_pending")
      return res.status(400).json({ message: "Ride is not in OTP pending state." });

    const code      = makeOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    ride.otp = { code, expiresAt, verified: false, attempts: 0 };
    await ride.save();

    res.json({
      message: "New OTP generated.",
      otp: code,
      expiresAt,
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to regenerate OTP." });
  }
};

module.exports = { generateOTP, getOTP, verifyOTP, regenerateOTP };
