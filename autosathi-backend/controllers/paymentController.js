const Razorpay = require("razorpay");
const crypto   = require("crypto");
const Ride     = require("../models/Ride");

// ─── Razorpay Instance ────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ══════════════════════════════════════════════════════════
   CREATE RAZORPAY ORDER
   POST /api/payment/create-order
   Protected (user)
   Body: { rideId }

   Flow:
   1. User's ride is completed
   2. Frontend calls this → gets Razorpay order
   3. Razorpay checkout opens in browser
   4. On success → verify-payment is called
══════════════════════════════════════════════════════════ */
const createOrder = async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: "rideId is required." });
    }

    // Find the ride
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    // Only the passenger can pay
    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not the passenger of this ride." });
    }

    // Ride must be completed before payment
    if (ride.status !== "completed") {
      return res.status(400).json({ message: "Payment can only be made for completed rides." });
    }

    // Already paid
    if (ride.payment.status === "paid") {
      return res.status(400).json({ message: "This ride has already been paid." });
    }

    // Create Razorpay order (amount in paise = ₹ × 100)
    const order = await razorpay.orders.create({
      amount:   ride.fare * 100,
      currency: "INR",
      receipt:  `ride_${ride._id}`,
      notes: {
        rideId:     ride._id.toString(),
        userId:     req.user._id.toString(),
        pickupLocation: ride.pickupLocation,
        dropLocation:   ride.dropLocation,
      },
    });

    // Save orderId on ride so we can verify later
    ride.payment.status          = "pending";
    ride.payment.razorpayOrderId = order.id;
    ride.payment.amount          = ride.fare;
    await ride.save();

    res.json({
      orderId:  order.id,
      amount:   order.amount,        // paise
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      ride: {
        id:             ride._id,
        fare:           ride.fare,
        pickupLocation: ride.pickupLocation,
        dropLocation:   ride.dropLocation,
      },
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    res.status(500).json({ message: "Failed to create payment order." });
  }
};

/* ══════════════════════════════════════════════════════════
   VERIFY PAYMENT & MARK PAID
   POST /api/payment/verify
   Protected (user)
   Body: { rideId, razorpay_order_id, razorpay_payment_id, razorpay_signature }

   Razorpay sends these 3 values after successful payment.
   We verify the signature using HMAC-SHA256.
══════════════════════════════════════════════════════════ */
const verifyPayment = async (req, res) => {
  try {
    const {
      rideId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!rideId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "All payment fields are required." });
    }

    // Step 1: Recreate the signature on our server
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Step 2: Compare with Razorpay's signature
    if (generatedSignature !== razorpay_signature) {
      // Signature mismatch = payment tampered or fake
      return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
    }

    // Step 3: Mark ride as paid
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    ride.payment.status             = "paid";
    ride.payment.method             = "online";
    ride.payment.razorpayPaymentId  = razorpay_payment_id;
    ride.payment.razorpaySignature  = razorpay_signature;
    ride.payment.paidAt             = new Date();
    await ride.save();

    res.json({
      message: "✅ Payment successful! Ride is fully paid.",
      paymentId: razorpay_payment_id,
      ride: {
        id:            ride._id,
        fare:          ride.fare,
        paymentStatus: ride.payment.status,
        paidAt:        ride.payment.paidAt,
      },
    });

  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    res.status(500).json({ message: "Payment verification failed on server." });
  }
};

/* ══════════════════════════════════════════════════════════
   PAY WITH CASH (No Razorpay)
   POST /api/payment/cash
   Protected (user)
   Body: { rideId }
══════════════════════════════════════════════════════════ */
const payCash = async (req, res) => {
  try {
    const { rideId } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    if (ride.status !== "completed") {
      return res.status(400).json({ message: "Ride must be completed before marking as cash paid." });
    }

    if (ride.payment.status === "paid") {
      return res.status(400).json({ message: "This ride is already paid." });
    }

    ride.payment.status  = "paid";
    ride.payment.method  = "cash";
    ride.payment.paidAt  = new Date();
    ride.payment.amount  = ride.fare;
    await ride.save();

    res.json({
      message: "✅ Cash payment recorded successfully.",
      ride: {
        id:            ride._id,
        fare:          ride.fare,
        paymentStatus: ride.payment.status,
        paymentMethod: ride.payment.method,
      },
    });

  } catch (error) {
    console.error("CASH PAYMENT ERROR:", error);
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════════════════════
   GET PAYMENT STATUS
   GET /api/payment/status/:rideId
   Protected
══════════════════════════════════════════════════════════ */
const getPaymentStatus = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId).select("payment fare status");

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    res.json({
      rideId:        ride._id,
      fare:          ride.fare,
      rideStatus:    ride.status,
      paymentStatus: ride.payment.status,
      paymentMethod: ride.payment.method,
      paidAt:        ride.payment.paidAt,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

/* ══════════════════════════════════════════════════════════
   RAZORPAY WEBHOOK (Optional - for server-side confirmation)
   POST /api/payment/webhook
   No auth (Razorpay calls this directly)
══════════════════════════════════════════════════════════ */
const webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const signature = req.headers["x-razorpay-signature"];
    const body      = JSON.stringify(req.body);

    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSig) {
      return res.status(400).json({ message: "Invalid webhook signature." });
    }

    const event = req.body.event;

    if (event === "payment.captured") {
      const paymentId = req.body.payload.payment.entity.id;
      const orderId   = req.body.payload.payment.entity.order_id;
      const notes     = req.body.payload.payment.entity.notes;

      if (notes?.rideId) {
        await Ride.findByIdAndUpdate(notes.rideId, {
          "payment.status":            "paid",
          "payment.method":            "online",
          "payment.razorpayPaymentId": paymentId,
          "payment.paidAt":            new Date(),
        });
      }
    }

    if (event === "payment.failed") {
      const notes = req.body.payload.payment.entity.notes;
      if (notes?.rideId) {
        await Ride.findByIdAndUpdate(notes.rideId, {
          "payment.status": "failed",
        });
      }
    }

    res.json({ status: "ok" });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    res.status(500).json({ message: "Webhook processing failed." });
  }
};

module.exports = { createOrder, verifyPayment, payCash, getPaymentStatus, webhook };
