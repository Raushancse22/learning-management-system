import React, { useEffect, useState } from "react";
import { FaCreditCard, FaLock, FaMoneyCheckAlt, FaTimes, FaUniversity } from "react-icons/fa";

import { classNames, formatCurrency } from "../lib/format";

const paymentMethods = [
  { id: "card", label: "Card", icon: FaCreditCard },
  { id: "upi", label: "UPI", icon: FaMoneyCheckAlt },
  { id: "netbanking", label: "Netbanking", icon: FaUniversity },
];

function createInitialForm(user) {
  return {
    paymentMethod: "card",
    payerName: user?.name || "",
    payerEmail: user?.email || "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    upiId: "",
    bankName: "",
  };
}

function loadScript(source) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${source}"]`);
    if (existing) {
      if (window.Razorpay) {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load checkout script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load checkout script."));
    document.body.appendChild(script);
  });
}

export default function PaymentModal({ checkout, user, busyAction, onClose, onConfirm }) {
  const [form, setForm] = useState(() => createInitialForm(user));
  const [gatewayState, setGatewayState] = useState("idle");
  const [gatewayError, setGatewayError] = useState("");

  useEffect(() => {
    if (!checkout) {
      return;
    }

    setForm(createInitialForm(user));
    setGatewayError("");
  }, [checkout, user]);

  const providerType = checkout?.provider?.type || "sandbox";
  const isRazorpayCheckout = providerType === "razorpay";

  useEffect(() => {
    if (!checkout || !isRazorpayCheckout) {
      setGatewayState("idle");
      return undefined;
    }

    let cancelled = false;

    async function prepareGateway() {
      if (window.Razorpay) {
        setGatewayState("ready");
        return;
      }

      setGatewayState("loading");
      try {
        await loadScript(checkout.provider.scriptUrl || "https://checkout.razorpay.com/v1/checkout.js");
        if (!cancelled) {
          setGatewayState(window.Razorpay ? "ready" : "error");
        }
      } catch (error) {
        if (!cancelled) {
          setGatewayState("error");
          setGatewayError(error.message || "Unable to load Razorpay right now.");
        }
      }
    }

    prepareGateway();
    return () => {
      cancelled = true;
    };
  }, [checkout, isRazorpayCheckout]);

  if (!checkout?.course || !checkout?.order) {
    return null;
  }

  const { course, order } = checkout;
  const isSubmitting = busyAction === "confirm-payment";

  function openRazorpayCheckout() {
    if (!window.Razorpay || !checkout.provider?.keyId || !checkout.provider?.razorpayOrderId) {
      setGatewayError("Razorpay is not ready yet. Refresh and try again in a moment.");
      return;
    }

    setGatewayError("");

    const instance = new window.Razorpay({
      key: checkout.provider.keyId,
      amount: checkout.provider.amountSubunits,
      currency: checkout.provider.currency || order.currency,
      name: checkout.provider.businessName || "Gatemate Learning",
      description: checkout.provider.description || `Purchase access to ${course.title}`,
      order_id: checkout.provider.razorpayOrderId,
      prefill: {
        name: form.payerName || checkout.provider.prefill?.name || "",
        email: form.payerEmail || checkout.provider.prefill?.email || "",
      },
      notes: {
        course_title: course.title,
        internal_order_id: String(order.id),
      },
      theme: {
        color: checkout.provider.themeColor || "#0f766e",
      },
      handler: (response) => {
        onConfirm(order.id, {
          paymentMethod: form.paymentMethod,
          payerName: form.payerName,
          payerEmail: form.payerEmail,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          setGatewayError("Checkout was closed before the payment finished.");
        },
      },
    });

    instance.on("payment.failed", (event) => {
      setGatewayError(event?.error?.description || "Payment failed in Razorpay. Please try again.");
    });
    instance.open();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/70 bg-white shadow-[0_40px_100px_-40px_rgba(15,23,42,0.55)]">
        <button
          className="interactive-soft absolute right-5 top-5 rounded-full bg-slate-100 p-3 text-slate-500 hover:bg-slate-200"
          type="button"
          onClick={onClose}
        >
          <FaTimes />
        </button>

        <div className="grid gap-0 lg:grid-cols-[0.92fr,1.08fr]">
          <div className="bg-slate-950 p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-300">Secure Checkout</p>
            <h2 className="mt-4 text-3xl font-semibold">{course.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">{course.description}</p>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Amount due</p>
              <p className="mt-3 text-4xl font-semibold">{formatCurrency(order.amount, order.currency)}</p>
              <p className="mt-3 text-sm text-slate-300">
                Order #{order.id} for {course.lessonCount} lessons and full quiz access.
              </p>
            </div>

            <div className="mt-8 space-y-4 text-sm text-slate-300">
              <div className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                <FaLock className="mt-1 text-teal-300" />
                <div>
                  <p className="font-semibold text-white">Access unlocks instantly</p>
                  <p className="mt-1 leading-6 text-slate-300">
                    After successful payment, the LMS auto-enrolls the learner and unlocks lesson videos, downloads, and assessments.
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
                {isRazorpayCheckout
                  ? "Payments are handled by Razorpay secure checkout. Learners can choose UPI, cards, or netbanking in the next step."
                  : "This is an in-app sandbox checkout flow for the website demo. No real bank charge is processed."}
              </div>
            </div>
          </div>

          <div className="p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Payment Details</p>
              <h3 className="mt-3 text-3xl text-slate-900">
                {isRazorpayCheckout ? "Continue with Razorpay" : "Choose a payment method"}
              </h3>
            </div>

            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (isRazorpayCheckout) {
                  openRazorpayCheckout();
                  return;
                }

                onConfirm(order.id, form);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="field"
                  placeholder="Payer name"
                  value={form.payerName}
                  onChange={(event) => setForm((current) => ({ ...current, payerName: event.target.value }))}
                />
                <input
                  className="field"
                  placeholder="Payer email"
                  type="email"
                  value={form.payerEmail}
                  onChange={(event) => setForm((current) => ({ ...current, payerEmail: event.target.value }))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const active = form.paymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      className={classNames(
                        "interactive-soft rounded-3xl border px-4 py-4 text-left",
                        active ? "border-teal-500 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        isRazorpayCheckout ? "opacity-90" : "",
                      )}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, paymentMethod: method.id }))}
                    >
                      <Icon className="text-lg" />
                      <p className="mt-4 font-semibold">{method.label}</p>
                    </button>
                  );
                })}
              </div>

              {isRazorpayCheckout ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                  Razorpay will open a secure payment window using the order created by the LMS backend. The selected chip above is only a
                  preference hint for your checkout session.
                </div>
              ) : null}

              {!isRazorpayCheckout && form.paymentMethod === "card" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className="field sm:col-span-2"
                    placeholder="Card number"
                    inputMode="numeric"
                    value={form.cardNumber}
                    onChange={(event) => setForm((current) => ({ ...current, cardNumber: event.target.value }))}
                  />
                  <input
                    className="field"
                    placeholder="MM/YY"
                    value={form.expiry}
                    onChange={(event) => setForm((current) => ({ ...current, expiry: event.target.value }))}
                  />
                  <input
                    className="field"
                    placeholder="CVV"
                    inputMode="numeric"
                    value={form.cvv}
                    onChange={(event) => setForm((current) => ({ ...current, cvv: event.target.value }))}
                  />
                </div>
              ) : null}

              {!isRazorpayCheckout && form.paymentMethod === "upi" ? (
                <input
                  className="field"
                  placeholder="UPI ID"
                  value={form.upiId}
                  onChange={(event) => setForm((current) => ({ ...current, upiId: event.target.value }))}
                />
              ) : null}

              {!isRazorpayCheckout && form.paymentMethod === "netbanking" ? (
                <input
                  className="field"
                  placeholder="Bank name"
                  value={form.bankName}
                  onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
                />
              ) : null}

              {gatewayError ? <p className="text-sm font-medium text-rose-600">{gatewayError}</p> : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  className="button-primary"
                  type="submit"
                  disabled={isSubmitting || (isRazorpayCheckout && gatewayState === "loading")}
                >
                  {isSubmitting
                    ? "Processing..."
                    : isRazorpayCheckout
                      ? gatewayState === "loading"
                        ? "Preparing secure checkout..."
                        : `Pay ${formatCurrency(order.amount, order.currency)} with Razorpay`
                      : `Pay ${formatCurrency(order.amount, order.currency)}`}
                </button>
                <button className="button-secondary" type="button" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
