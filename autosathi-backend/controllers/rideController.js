const crypto = require("crypto");
const Ride   = require("../models/Ride");
const User   = require("../models/User");

const BASE_FARE    = 20;
const RATE_PER_KM  = 12;
const calculateFare = (km) => Math.round(BASE_FARE + km * RATE_PER_KM);
const makeOTP       = ()   => String(crypto.randomInt(100000, 999999));

/* ══ CALCULATE FARE ════════════════════════════════════════
   POST /api/rides/fare  |  user only
   Body: { pickupLocation, dropLocation, distanceKm }
══════════════════════════════════════════════════════════ */
const getFare = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, distanceKm } = req.body;
    if (!pickupLocation || !dropLocation || !distanceKm)
      return res.status(400).json({ message: "Please provide pickupLocation, dropLocation and distanceKm." });

    const distance = parseFloat(distanceKm);
    if (isNaN(distance) || distance <= 0)
      return res.status(400).json({ message: "Invalid distance value." });

    const fare = calculateFare(distance);
    res.json({ pickupLocation, dropLocation, distanceKm: distance, baseFare: BASE_FARE, ratePerKm: RATE_PER_KM, totalFare: fare,
      breakdown: `₹${BASE_FARE} base + (${distance} km × ₹${RATE_PER_KM}) = ₹${fare}` });
  } catch (err) {
    res.status(500).json({ message: "Server error calculating fare." });
  }
};

/* ══ CREATE RIDE ════════════════════════════════════════════
   POST /api/rides  |  user only
   Body: { pickupLocation, dropLocation, distanceKm, pickupCoords?, dropCoords? }
══════════════════════════════════════════════════════════ */
const createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, distanceKm, pickupCoords, dropCoords } = req.body;
    if (!pickupLocation || !dropLocation || !distanceKm)
      return res.status(400).json({ message: "Please provide pickupLocation, dropLocation and distanceKm." });

    const activeRide = await Ride.findOne({ user: req.user._id, status: { $in: ["pending","accepted","otp_pending","ongoing"] } });
    if (activeRide)
      return res.status(400).json({ message: "You already have an active ride. Complete or cancel it first.", activeRideId: activeRide._id });

    const distance = parseFloat(distanceKm);
    const fare     = calculateFare(distance);

    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation,
      dropLocation,
      distanceKm: distance,
      fare,
      status: "pending",
      pickupCoords: pickupCoords || { lat: null, lng: null },
      dropCoords:   dropCoords   || { lat: null, lng: null },
    });

    const populated = await ride.populate("user", "name phone");
    res.status(201).json({ message: "Ride booked successfully! Searching for driver...", ride: populated });
  } catch (err) {
    console.error("CREATE RIDE:", err);
    res.status(500).json({ message: "Server error creating ride." });
  }
};

/* ══ PENDING RIDES ══════════════════════════════════════════
   GET /api/rides/pending  |  driver only
══════════════════════════════════════════════════════════ */
const getPendingRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: "pending" }).populate("user","name phone").sort({ createdAt: -1 });
    res.json({ count: rides.length, rides });
  } catch { res.status(500).json({ message: "Server error." }); }
};

/* ══ USER RIDES ═════════════════════════════════════════════
   GET /api/rides/my  |  user only
══════════════════════════════════════════════════════════ */
const getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user._id })
      .populate("driver","name phone vehicleNumber vehicleColor averageRating").sort({ createdAt: -1 });
    res.json({ count: rides.length, rides });
  } catch { res.status(500).json({ message: "Server error." }); }
};

/* ══ DRIVER RIDES ═══════════════════════════════════════════
   GET /api/rides/driver/history  |  driver only
══════════════════════════════════════════════════════════ */
const getDriverRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.user._id }).populate("user","name phone").sort({ createdAt: -1 });
    res.json({ count: rides.length, rides });
  } catch { res.status(500).json({ message: "Server error." }); }
};

/* ══ RIDE BY ID ═════════════════════════════════════════════
   GET /api/rides/:id
══════════════════════════════════════════════════════════ */
const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("user","name phone")
      .populate("driver","name phone vehicleNumber vehicleColor averageRating");
    if (!ride) return res.status(404).json({ message: "Ride not found." });

    // Don't expose OTP code to driver (only to user on their screen via /api/otp/:id)
    const rideObj = ride.toObject();
    if (req.user.role === "driver") { delete rideObj.otp; }
    else { delete rideObj.otp?.code; } // user sees otp.verified/expiresAt but not code through this route

    res.json({ ride: rideObj });
  } catch { res.status(500).json({ message: "Server error." }); }
};

/* ══ ACCEPT RIDE ════════════════════════════════════════════
   PUT /api/rides/:id/accept  |  driver only
   Auto-generates OTP and sets status to otp_pending
══════════════════════════════════════════════════════════ */
const acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found." });
    if (ride.status !== "pending") return res.status(400).json({ message: "This ride is no longer available." });

    const driverActive = await Ride.findOne({ driver: req.user._id, status: { $in: ["accepted","otp_pending","ongoing"] } });
    if (driverActive) return res.status(400).json({ message: "You already have an active ride. Complete it first." });

    // Auto-generate OTP on accept
    const otpCode   = makeOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    ride.status     = "otp_pending";
    ride.driver     = req.user._id;
    ride.acceptedAt = new Date();
    ride.otp        = { code: otpCode, expiresAt, verified: false, attempts: 0 };
    await ride.save();

    const populated = await ride.populate([
      { path: "user",   select: "name phone" },
      { path: "driver", select: "name phone vehicleNumber vehicleColor averageRating" },
    ]);

    res.json({ message: "Ride accepted! OTP generated for passenger. Head to pickup.", ride: populated });
  } catch (err) {
    console.error("ACCEPT RIDE:", err);
    res.status(500).json({ message: "Server error accepting ride." });
  }
};

/* ══ START RIDE (legacy — now OTP verify does this) ════════
   PUT /api/rides/:id/start  |  driver only
   Only allowed if OTP already verified OR no OTP set
══════════════════════════════════════════════════════════ */
const startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found." });
    if (!["accepted","otp_pending"].includes(ride.status))
      return res.status(400).json({ message: "Ride must be accepted before starting." });
    if (ride.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "You are not the driver of this ride." });
    if (ride.otp?.code && !ride.otp.verified)
      return res.status(400).json({ message: "Please verify passenger OTP before starting the ride." });

    ride.status    = "ongoing";
    ride.startedAt = new Date();
    await ride.save();
    res.json({ message: "Ride started! Have a safe journey. 🚗", ride });
  } catch (err) {
    res.status(500).json({ message: "Server error starting ride." });
  }
};

/* ══ COMPLETE RIDE ══════════════════════════════════════════
   PUT /api/rides/:id/complete  |  driver only
══════════════════════════════════════════════════════════ */
const completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found." });
    if (ride.status !== "ongoing") return res.status(400).json({ message: "Only an ongoing ride can be completed." });
    if (ride.driver.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not your ride." });

    ride.status      = "completed";
    ride.completedAt = new Date();
    await ride.save();

    const populated = await ride.populate([
      { path: "user",   select: "name phone" },
      { path: "driver", select: "name phone vehicleNumber" },
    ]);
    res.json({ message: "Ride completed! Thank you for using AutoSathi. 🎉", ride: populated });
  } catch (err) {
    res.status(500).json({ message: "Server error completing ride." });
  }
};

/* ══ CANCEL RIDE ════════════════════════════════════════════
   PUT /api/rides/:id/cancel  |  user or driver
══════════════════════════════════════════════════════════ */
const cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found." });
    if (!["pending","accepted","otp_pending"].includes(ride.status))
      return res.status(400).json({ message: "Only pending or accepted rides can be cancelled." });

    const isUser   = ride.user.toString()                    === req.user._id.toString();
    const isDriver = ride.driver && ride.driver.toString()   === req.user._id.toString();
    if (!isUser && !isDriver) return res.status(403).json({ message: "Not allowed to cancel this ride." });

    ride.status      = "cancelled";
    ride.cancelledAt = new Date();
    ride.cancelReason = req.body.reason || "No reason provided";
    await ride.save();
    res.json({ message: "Ride cancelled successfully.", ride });
  } catch (err) {
    res.status(500).json({ message: "Server error cancelling ride." });
  }
};

/* ══ RATE DRIVER ════════════════════════════════════════════
   PUT /api/rides/:id/rate  |  user only
   Body: { rating: 1-5, comment? }
══════════════════════════════════════════════════════════ */
const rateDriver = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1–5." });

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found." });
    if (ride.status !== "completed") return res.status(400).json({ message: "Can only rate completed rides." });
    if (ride.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not your ride." });
    if (ride.rating) return res.status(400).json({ message: "Already rated." });

    ride.rating = rating; ride.ratingComment = comment || null; ride.ratedAt = new Date();
    await ride.save();

    const driver = await User.findById(ride.driver);
    if (driver) { driver.addRating(rating); await driver.save(); }

    res.json({ message: `Thank you! You gave ${rating} ⭐`, rating, driverAverageRating: driver?.averageRating });
  } catch (err) {
    res.status(500).json({ message: "Server error submitting rating." });
  }
};

/* ══ UPDATE DRIVER LOCATION ═════════════════════════════════
   PUT /api/rides/:id/location  |  driver only
   Body: { lat, lng }
══════════════════════════════════════════════════════════ */
const updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng are required." });

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, driver: req.user._id, status: { $in: ["otp_pending","ongoing"] } },
      { driverLocation: { lat, lng } },
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: "Active ride not found." });
    res.json({ driverLocation: ride.driverLocation });
  } catch { res.status(500).json({ message: "Location update failed." }); }
};

module.exports = { getFare, createRide, getPendingRides, getUserRides, getDriverRides,
  getRideById, acceptRide, startRide, completeRide, cancelRide, rateDriver, updateDriverLocation };
