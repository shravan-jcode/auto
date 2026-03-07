const Ride = require("../models/Ride");
const User = require("../models/User");

// ─── Fare Calculation Logic ───────────────────────────────
const BASE_FARE = 20;      // ₹20 base fare
const RATE_PER_KM = 12;    // ₹12 per km

const calculateFare = (distanceKm) => {
  const fare = BASE_FARE + distanceKm * RATE_PER_KM;
  return Math.round(fare);
};

/* ══════════════════════════════════════════
   CALCULATE FARE (Before booking)
   POST /api/rides/fare
   Protected (user)
   Body: { pickupLocation, dropLocation, distanceKm }
══════════════════════════════════════════ */
const getFare = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, distanceKm } = req.body;

    if (!pickupLocation || !dropLocation || !distanceKm) {
      return res.status(400).json({
        message: "Please provide pickupLocation, dropLocation and distanceKm.",
      });
    }

    const distance = parseFloat(distanceKm);
    if (isNaN(distance) || distance <= 0) {
      return res.status(400).json({ message: "Invalid distance value." });
    }

    const fare = calculateFare(distance);

    res.json({
      pickupLocation,
      dropLocation,
      distanceKm: distance,
      baseFare: BASE_FARE,
      ratePerKm: RATE_PER_KM,
      totalFare: fare,
      breakdown: `₹${BASE_FARE} base + (${distance} km × ₹${RATE_PER_KM}) = ₹${fare}`,
    });

  } catch (error) {
    console.error("FARE ERROR:", error);
    res.status(500).json({ message: "Server error calculating fare." });
  }
};

/* ══════════════════════════════════════════
   CREATE / BOOK RIDE
   POST /api/rides
   Protected (user)
   Body: { pickupLocation, dropLocation, distanceKm }
══════════════════════════════════════════ */
const createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, distanceKm } = req.body;

    if (!pickupLocation || !dropLocation || !distanceKm) {
      return res.status(400).json({
        message: "Please provide pickupLocation, dropLocation and distanceKm.",
      });
    }

    // Check if user already has an active ride
    const activeRide = await Ride.findOne({
      user: req.user._id,
      status: { $in: ["pending", "accepted", "ongoing"] },
    });

    if (activeRide) {
      return res.status(400).json({
        message: "You already have an active ride. Complete or cancel it first.",
        activeRideId: activeRide._id,
      });
    }

    const distance = parseFloat(distanceKm);
    const fare = calculateFare(distance);

    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation,
      dropLocation,
      distanceKm: distance,
      fare,
      status: "pending",
    });

    // Populate user name for driver to see
    const populatedRide = await ride.populate("user", "name phone");

    res.status(201).json({
      message: "Ride booked successfully! Searching for driver...",
      ride: populatedRide,
    });

  } catch (error) {
    console.error("CREATE RIDE ERROR:", error);
    res.status(500).json({ message: "Server error creating ride." });
  }
};

/* ══════════════════════════════════════════
   GET ALL PENDING RIDES (Driver sees these)
   GET /api/rides/pending
   Protected (driver)
══════════════════════════════════════════ */
const getPendingRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: "pending" })
      .populate("user", "name phone")
      .sort({ createdAt: -1 });

    res.json({
      count: rides.length,
      rides,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error fetching pending rides." });
  }
};

/* ══════════════════════════════════════════
   GET USER'S OWN RIDES (Booking History)
   GET /api/rides/my
   Protected (user)
══════════════════════════════════════════ */
const getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user._id })
      .populate("driver", "name phone vehicleNumber vehicleColor averageRating")
      .sort({ createdAt: -1 });

    res.json({
      count: rides.length,
      rides,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error fetching your rides." });
  }
};

/* ══════════════════════════════════════════
   GET DRIVER'S OWN RIDES
   GET /api/rides/driver/history
   Protected (driver)
══════════════════════════════════════════ */
const getDriverRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.user._id })
      .populate("user", "name phone")
      .sort({ createdAt: -1 });

    res.json({
      count: rides.length,
      rides,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error fetching driver rides." });
  }
};

/* ══════════════════════════════════════════
   GET SINGLE RIDE BY ID
   GET /api/rides/:id
   Protected
══════════════════════════════════════════ */
const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("user", "name phone")
      .populate("driver", "name phone vehicleNumber vehicleColor averageRating");

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    res.json({ ride });

  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   DRIVER ACCEPTS RIDE
   PUT /api/rides/:id/accept
   Protected (driver)
══════════════════════════════════════════ */
const acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.status !== "pending") {
      return res.status(400).json({ message: "This ride is no longer available." });
    }

    // Check driver doesn't already have an active ride
    const driverActiveRide = await Ride.findOne({
      driver: req.user._id,
      status: { $in: ["accepted", "ongoing"] },
    });

    if (driverActiveRide) {
      return res.status(400).json({
        message: "You already have an active ride. Complete it first.",
      });
    }

    ride.status = "accepted";
    ride.driver = req.user._id;
    ride.acceptedAt = new Date();

    await ride.save();

    const populatedRide = await ride.populate([
      { path: "user", select: "name phone" },
      { path: "driver", select: "name phone vehicleNumber vehicleColor averageRating" },
    ]);

    res.json({
      message: "Ride accepted! Head to pickup location.",
      ride: populatedRide,
    });

  } catch (error) {
    console.error("ACCEPT RIDE ERROR:", error);
    res.status(500).json({ message: "Server error accepting ride." });
  }
};

/* ══════════════════════════════════════════
   DRIVER STARTS RIDE
   PUT /api/rides/:id/start
   Protected (driver)
══════════════════════════════════════════ */
const startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.status !== "accepted") {
      return res.status(400).json({ message: "Ride must be in 'accepted' status to start." });
    }

    // Make sure this driver owns the ride
    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not the driver of this ride." });
    }

    ride.status = "ongoing";
    ride.startedAt = new Date();

    await ride.save();

    res.json({
      message: "Ride started! Have a safe journey. 🚗",
      ride,
    });

  } catch (error) {
    console.error("START RIDE ERROR:", error);
    res.status(500).json({ message: "Server error starting ride." });
  }
};

/* ══════════════════════════════════════════
   DRIVER COMPLETES RIDE
   PUT /api/rides/:id/complete
   Protected (driver)
══════════════════════════════════════════ */
const completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.status !== "ongoing") {
      return res.status(400).json({ message: "Only an ongoing ride can be completed." });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not the driver of this ride." });
    }

    ride.status = "completed";
    ride.completedAt = new Date();

    await ride.save();

    const populatedRide = await ride.populate([
      { path: "user", select: "name phone" },
      { path: "driver", select: "name phone vehicleNumber" },
    ]);

    res.json({
      message: "Ride completed! Thank you for using AutoSathi. 🎉",
      ride: populatedRide,
    });

  } catch (error) {
    console.error("COMPLETE RIDE ERROR:", error);
    res.status(500).json({ message: "Server error completing ride." });
  }
};

/* ══════════════════════════════════════════
   CANCEL RIDE
   PUT /api/rides/:id/cancel
   Protected (user or driver)
══════════════════════════════════════════ */
const cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    // Only pending or accepted rides can be cancelled
    if (!["pending", "accepted"].includes(ride.status)) {
      return res.status(400).json({
        message: "Only pending or accepted rides can be cancelled.",
      });
    }

    // Only the user who booked OR the assigned driver can cancel
    const isUser = ride.user.toString() === req.user._id.toString();
    const isDriver = ride.driver && ride.driver.toString() === req.user._id.toString();

    if (!isUser && !isDriver) {
      return res.status(403).json({ message: "You are not allowed to cancel this ride." });
    }

    ride.status = "cancelled";
    ride.cancelledAt = new Date();
    ride.cancelReason = req.body.reason || "No reason provided";

    await ride.save();

    res.json({
      message: "Ride cancelled successfully.",
      ride,
    });

  } catch (error) {
    console.error("CANCEL RIDE ERROR:", error);
    res.status(500).json({ message: "Server error cancelling ride." });
  }
};

/* ══════════════════════════════════════════
   RATE DRIVER (User rates after completion)
   PUT /api/rides/:id/rate
   Protected (user)
   Body: { rating: 1-5, comment: "optional" }
══════════════════════════════════════════ */
const rateDriver = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.status !== "completed") {
      return res.status(400).json({ message: "You can only rate a completed ride." });
    }

    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not the passenger of this ride." });
    }

    if (ride.rating) {
      return res.status(400).json({ message: "You have already rated this ride." });
    }

    // Save rating on ride
    ride.rating = rating;
    ride.ratingComment = comment || null;
    ride.ratedAt = new Date();
    await ride.save();

    // Update driver's average rating
    const driver = await User.findById(ride.driver);
    if (driver) {
      driver.addRating(rating);
      await driver.save();
    }

    res.json({
      message: `Thank you for rating! You gave ${rating} ⭐`,
      rating,
      driverAverageRating: driver?.averageRating || null,
    });

  } catch (error) {
    console.error("RATE DRIVER ERROR:", error);
    res.status(500).json({ message: "Server error submitting rating." });
  }
};

/* ══════════════════════════════════════════
   UPDATE DRIVER LIVE LOCATION
   PUT /api/rides/:id/location
   Protected (driver)
   Body: { lat, lng }
══════════════════════════════════════════ */
const updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required." });
    }

    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        driver: req.user._id,
        status: { $in: ["accepted", "ongoing"] },
      },
      { driverLocation: { lat, lng } },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ message: "Active ride not found." });
    }

    res.json({ driverLocation: ride.driverLocation });

  } catch (error) {
    res.status(500).json({ message: "Location update failed." });
  }
};

module.exports = {
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
};
