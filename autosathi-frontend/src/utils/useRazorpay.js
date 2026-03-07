import { useCallback } from "react";

/**
 * useRazorpay
 * Dynamically loads the Razorpay checkout script,
 * then opens the payment popup with given options.
 */
export function useRazorpay() {

  const loadScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script    = document.createElement("script");
      script.src      = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload   = () => resolve(true);
      script.onerror  = () => resolve(false);
      document.body.appendChild(script);
    });

  /**
   * openCheckout({ orderId, amount, keyId, ride, user, onSuccess, onFailure })
   *   amount  – in paise (₹ × 100), already from backend
   *   onSuccess(response) – called with { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   *   onFailure(error)    – called on dismiss or error
   */
  const openCheckout = useCallback(async ({
    orderId, amount, keyId, ride, user, onSuccess, onFailure
  }) => {
    const loaded = await loadScript();
    if (!loaded) {
      onFailure && onFailure(new Error("Razorpay SDK failed to load."));
      return;
    }

    const options = {
      key:         keyId,
      amount:      amount,          // paise
      currency:    "INR",
      name:        "AutoSathi 🛺",
      description: `Ride: ${ride?.pickupLocation} → ${ride?.dropLocation}`,
      order_id:    orderId,
      prefill: {
        name:    user?.name  || "",
        email:   user?.email || "",
        contact: user?.phone || "",
      },
      notes: {
        rideId: ride?.id || "",
      },
      theme: {
        color: "#FFB800",   // AutoSathi yellow
      },
      modal: {
        ondismiss: () => {
          onFailure && onFailure(new Error("Payment cancelled by user."));
        },
      },
      handler: (response) => {
        // response = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
        onSuccess && onSuccess(response);
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      onFailure && onFailure(response.error);
    });
    rzp.open();
  }, []);

  return { openCheckout };
}
