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

export default function PaymentModal({ checkout, user, busyAction, onClose, onConfirm }) {
  const [form, setForm] = useState(() => createInitialForm(user));

  useEffect(() => {
    if (!checkout) {
      return;
    }

    setForm(createInitialForm(user));
  }, [checkout, user]);

  if (!checkout?.course || !checkout?.order) {
    return null;
  }

  const { course, order } = checkout;
  const isSubmitting = busyAction === "confirm-payment";

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
              <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
                This is an in-app sandbox checkout flow for the website demo. No real bank charge is processed.
              </div>
            </div>
          </div>

          <div className="p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Payment Details</p>
              <h3 className="mt-3 text-3xl text-slate-900">Choose a payment method</h3>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const active = form.paymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    className={classNames(
                      "interactive-soft rounded-3xl border px-4 py-4 text-left",
                      active ? "border-teal-500 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
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

            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
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

              {form.paymentMethod === "card" ? (
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

              {form.paymentMethod === "upi" ? (
                <input
                  className="field"
                  placeholder="UPI ID"
                  value={form.upiId}
                  onChange={(event) => setForm((current) => ({ ...current, upiId: event.target.value }))}
                />
              ) : null}

              {form.paymentMethod === "netbanking" ? (
                <input
                  className="field"
                  placeholder="Bank name"
                  value={form.bankName}
                  onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
                />
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <button className="button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : `Pay ${formatCurrency(order.amount, order.currency)}`}
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
