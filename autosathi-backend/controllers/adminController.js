const User = require("../models/User");
const Ride = require("../models/Ride");

/* ══════════════════════════════════════════
   GET DASHBOARD STATS
   GET /api/admin/stats
══════════════════════════════════════════ */
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalDrivers, totalRides, completedRides, pendingRides, cancelledRides] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "driver" }),
        Ride.countDocuments(),
        Ride.countDocuments({ status: "completed" }),
        Ride.countDocuments({ status: "pending" }),
        Ride.countDocuments({ status: "cancelled" }),
      ]);

    res.json({
      totalUsers,
      totalDrivers,
      totalRides,
      completedRides,
      pendingRides,
      cancelledRides,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   GET ALL USERS
   GET /api/admin/users
══════════════════════════════════════════ */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").sort({ createdAt: -1 });
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   GET ALL DRIVERS
   GET /api/admin/drivers
══════════════════════════════════════════ */
const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" }).select("-password").sort({ createdAt: -1 });
    res.json({ count: drivers.length, drivers });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   GET ALL BOOKINGS / RIDES
   GET /api/admin/rides
══════════════════════════════════════════ */
const getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("user", "name email phone")
      .populate("driver", "name phone vehicleNumber")
      .sort({ createdAt: -1 });

    res.json({ count: rides.length, rides });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   BLOCK / UNBLOCK USER OR DRIVER
   PUT /api/admin/users/:id/block
   Body: { isBlocked: true | false }
══════════════════════════════════════════ */
const toggleBlockUser = async (req, res) => {
  try {
    const { isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      message: `User has been ${isBlocked ? "blocked 🚫" : "unblocked ✅"}`,
      user,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   DELETE USER
   DELETE /api/admin/users/:id
══════════════════════════════════════════ */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "User deleted successfully." });

  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   ADMIN CANCEL A RIDE
   PUT /api/admin/rides/:id/cancel
══════════════════════════════════════════ */
const adminCancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.status === "completed" || ride.status === "cancelled") {
      return res.status(400).json({ message: "This ride is already finished." });
    }

    ride.status = "cancelled";
    ride.cancelledAt = new Date();
    ride.cancelReason = req.body.reason || "Cancelled by admin";
    await ride.save();

    res.json({ message: "Ride cancelled by admin.", ride });

  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getAllDrivers,
  getAllRides,
  toggleBlockUser,
  deleteUser,
  adminCancelRide,
};
