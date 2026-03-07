require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// ─── Connect to MongoDB ───────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────
app.use("/api/auth",  require("./routes/authRoutes"));
app.use("/api/rides", require("./routes/rideRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// ─── Health Check ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ AutoSathi Backend is Running",
    version: "1.0.0",
    endpoints: {
      auth:  "/api/auth",
      rides: "/api/rides",
      admin: "/api/admin",
    },
  });
});

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.stack);
  res.status(500).json({ message: "Something went wrong on the server." });
});

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AutoSathi server running on port ${PORT}`);
});
