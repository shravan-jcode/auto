import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRideById, createPaymentOrder, verifyPayment, payCash } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useRazorpay } from "../utils/useRazorpay";
import { Spinner, Toast } from "../components/UI";

// ─── Payment status badge ─────────────────────────────────
function PaymentBadge({ status }) {
  const map = {
    unpaid:  { cls: "bg-red-100 text-red-600",    icon: "⏳", label: "Unpaid" },
    pending: { cls: "bg-yellow-100 text-yellow-700", icon: "🔄", label: "Pending" },
    paid:    { cls: "bg-green-100 text-green-700",  icon: "✅", label: "Paid" },
    failed:  { cls: "bg-red-100 text-red-600",    icon: "❌", label: "Failed" },
  };
  const s = map[status] || map.unpaid;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

export default function PaymentPage() {
  const { rideId }              = useParams();
  const { user }                = useAuth();
  const navigate                = useNavigate();
  const { openCheckout }        = useRazorpay();

  const [ride, setRide]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    getRideById(rideId)
      .then((res) => setRide(res.data.ride))
      .catch(() => showToast("Could not load ride", "error"))
      .finally(() => setLoading(false));
  }, [rideId]);

  // ── Online Payment via Razorpay ───────────────────────
  const handleOnlinePayment = async () => {
    setPaying(true);
    try {
      // Step 1: Ask backend to create a Razorpay order
      const orderRes = await createPaymentOrder(rideId);
      const { orderId, amount, keyId } = orderRes.data;

      // Step 2: Open Razorpay checkout
      openCheckout({
        orderId,
        amount,
        keyId,
        ride: orderRes.data.ride,
        user,
        onSuccess: async (response) => {
          // Step 3: Verify payment signature on backend
          try {
            await verifyPayment({
              rideId,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            setPaymentDone(true);
            // Refresh ride data
            const updated = await getRideById(rideId);
            setRide(updated.data.ride);
            showToast("🎉 Payment successful! Ride fully paid.", "success");
          } catch (err) {
            showToast(err.response?.data?.message || "Payment verification failed", "error");
          }
          setPaying(false);
        },
        onFailure: (err) => {
          const msg = err?.description || err?.message || "Payment was cancelled";
          showToast(msg, "error");
          setPaying(false);
        },
      });
    } catch (err) {
      showToast(err.response?.data?.message || "Could not initiate payment", "error");
      setPaying(false);
    }
  };

  // ── Cash Payment ──────────────────────────────────────
  const handleCashPayment = async () => {
    if (!window.confirm(`Confirm cash payment of ₹${ride?.fare}?`)) return;
    setPaying(true);
    try {
      await payCash(rideId);
      const updated = await getRideById(rideId);
      setRide(updated.data.ride);
      setPaymentDone(true);
      showToast("✅ Cash payment recorded!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to record payment", "error");
    }
    setPaying(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner text="Loading payment details..." />
    </div>
  );

  if (!ride) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="text-6xl block mb-3">😕</span>
        <p className="font-bold text-gray-600">Ride not found</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary mt-4">Go Home</button>
      </div>
    </div>
  );

  const alreadyPaid = ride.payment?.status === "paid";

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-auto-dark text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => navigate(`/ride/${rideId}`)}
            className="text-gray-400 hover:text-white text-sm mb-4 block">← Back to Ride</button>
          <h1 className="font-display font-bold text-3xl">
            💳 <span className="text-auto-yellow">Payment</span>
          </h1>
          <p className="text-gray-400 mt-1">Ride #{rideId?.slice(-8).toUpperCase()}</p>
        </div>
        <div className="road-line" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* ── Fare Summary Card ── */}
        <div className="card bg-gradient-to-br from-auto-dark to-auto-card text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Amount Due</p>
              <p className="font-display font-bold text-5xl text-auto-yellow mt-1">₹{ride.fare}</p>
            </div>
            <div className="text-right">
              <PaymentBadge status={ride.payment?.status || "unpaid"} />
              {ride.payment?.paidAt && (
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(ride.payment.paidAt).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>

          {/* Route summary */}
          <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">📍</span>
              <span className="text-gray-300">{ride.pickupLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">🏁</span>
              <span className="text-gray-300">{ride.dropLocation}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-xs text-gray-400">
              <span>{ride.distanceKm} km</span>
              <span>Base ₹20 + {ride.distanceKm} km × ₹12</span>
            </div>
          </div>
        </div>

        {/* ── Already Paid ── */}
        {alreadyPaid && (
          <div className="card border-2 border-green-400 bg-green-50 text-center">
            <span className="text-5xl block mb-3">✅</span>
            <h2 className="font-display font-bold text-2xl text-green-700 mb-2">Payment Complete!</h2>
            <p className="text-green-600 mb-1">
              Paid via <span className="font-bold uppercase">{ride.payment?.method}</span>
            </p>
            {ride.payment?.razorpayPaymentId && (
              <p className="text-xs text-gray-500 font-mono mt-1">
                ID: {ride.payment.razorpayPaymentId}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {new Date(ride.payment?.paidAt).toLocaleString("en-IN")}
            </p>
            <button onClick={() => navigate(`/ride/${rideId}`)}
              className="btn-primary mt-6 px-8">
              Back to Ride →
            </button>
          </div>
        )}

        {/* ── Payment Options (unpaid) ── */}
        {!alreadyPaid && (
          <>
            {/* Online Payment */}
            <div className="card border-2 border-auto-yellow hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-auto-yellow/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">💳</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-auto-dark">Pay Online</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    UPI, Credit/Debit Card, Net Banking, Wallets via Razorpay
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["UPI", "GPay", "PhonePe", "Cards", "Net Banking"].map((m) => (
                      <span key={m}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-semibold">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleOnlinePayment}
                disabled={paying}
                className="btn-primary w-full py-4 text-lg disabled:opacity-60 flex items-center justify-center gap-2">
                {paying ? (
                  <><div className="w-5 h-5 border-2 border-auto-dark border-t-transparent rounded-full animate-spin" /> Processing...</>
                ) : (
                  <>Pay ₹{ride.fare} Online →</>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                🔒 100% Secure · Powered by Razorpay
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 font-semibold text-sm">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Cash Payment */}
            <div className="card border-2 border-gray-200 hover:border-gray-400 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">💵</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-auto-dark">Pay Cash</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Pay your driver directly in cash and mark as paid here
                  </p>
                </div>
              </div>

              <button
                onClick={handleCashPayment}
                disabled={paying}
                className="btn-secondary w-full py-4 text-lg disabled:opacity-60">
                {paying ? "Recording..." : "Mark as Cash Paid ₹" + ride.fare}
              </button>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
              <span className="text-xl flex-shrink-0">🛡️</span>
              <p>
                <span className="font-bold">Safe & Secure.</span> Online payments are processed by
                Razorpay with 256-bit SSL encryption. AutoSathi never stores your card details.
              </p>
            </div>
          </>
        )}

        {/* Payment success animation overlay */}
        {paymentDone && !alreadyPaid && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm mx-4">
              <span className="text-7xl block mb-4">🎉</span>
              <h2 className="font-display font-bold text-3xl text-green-600 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-500 mb-6">₹{ride.fare} paid. Thank you for using AutoSathi!</p>
              <button onClick={() => navigate("/history")} className="btn-primary px-8 py-3 w-full">
                View All Rides
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
