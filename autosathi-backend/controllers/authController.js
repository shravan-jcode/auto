const User = require("../models/User");
const jwt = require("jsonwebtoken");

// ─── Helper: Generate JWT Token ───────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ─── Helper: Safe User Object (no password) ───────────────
const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isOnline: user.isOnline,
  vehicleNumber: user.vehicleNumber,
  vehicleColor: user.vehicleColor,
  vehicleType: user.vehicleType,
  averageRating: user.averageRating,
  ratingCount: user.ratingCount,
});

/* ══════════════════════════════════════════
   REGISTER USER
   POST /api/auth/register
   Body: { name, email, phone, password, role }
   role = "user" | "driver"
══════════════════════════════════════════ */
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, vehicleNumber, vehicleColor, vehicleType } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Please provide name, email, phone and password." });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered. Please login." });
    }

    // Validate driver fields
    const userRole = role || "user";
    if (userRole === "driver" && !vehicleNumber) {
      return res.status(400).json({ message: "Vehicle number is required for driver registration." });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: userRole,
      vehicleNumber: vehicleNumber || null,
      vehicleColor: vehicleColor || null,
      vehicleType: vehicleType || "Auto Rickshaw",
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Registration successful! Welcome to AutoSathi.",
      token,
      user: safeUser(user),
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

/* ══════════════════════════════════════════
   LOGIN USER
   POST /api/auth/login
   Body: { email, password }
══════════════════════════════════════════ */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Contact admin." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful!",
      token,
      user: safeUser(user),
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

/* ══════════════════════════════════════════
   GET MY PROFILE
   GET /api/auth/me
   Protected
══════════════════════════════════════════ */
const getMyProfile = async (req, res) => {
  try {
    res.json({ user: safeUser(req.user) });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════
   UPDATE DRIVER ONLINE STATUS
   PUT /api/auth/driver/status
   Protected (driver only)
   Body: { isOnline: true | false }
══════════════════════════════════════════ */
const updateDriverStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (req.user.role !== "driver") {
      return res.status(403).json({ message: "Only drivers can update online status." });
    }

    const driver = await User.findByIdAndUpdate(
      req.user._id,
      { isOnline },
      { new: true }
    ).select("-password");

    res.json({
      message: `You are now ${isOnline ? "Online 🟢" : "Offline 🔴"}`,
      isOnline: driver.isOnline,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = { registerUser, loginUser, getMyProfile, updateDriverStatus };
