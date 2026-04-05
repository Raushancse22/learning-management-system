const crypto = require("node:crypto");

const { text } = require("./db");
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_THEME_COLOR, isRazorpayConfigured } = require("./config");

const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const ZERO_DECIMAL_CURRENCIES = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]);
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

function getPaymentGateway() {
  return isRazorpayConfigured ? "razorpay" : "sandbox";
}

function getCurrencyMultiplier(currency = "INR") {
  const normalized = text(currency).toUpperCase() || "INR";
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
    return 1;
  }

  if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
    return 1000;
  }

  return 100;
}

function toCurrencySubunits(amount = 0, currency = "INR") {
  return Math.max(Math.round(Number(amount || 0) * getCurrencyMultiplier(currency)), 0);
}

function createGatewayReceipt(orderId, courseId, userId) {
  return `gml-${orderId}-${courseId}-${userId}`.slice(0, 40);
}

async function callRazorpay(path, { method = "GET", body } = {}) {
  if (!isRazorpayConfigured) {
    throw new Error("Razorpay is not configured on this server.");
  }

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payloadText = await response.text();
  let payload = {};
  if (payloadText) {
    try {
      payload = JSON.parse(payloadText);
    } catch {
      payload = { description: payloadText };
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error?.description || payload?.description || "Razorpay request failed.");
  }

  return payload;
}

async function createRazorpayOrder({ amount, currency = "INR", receipt, notes = {} }) {
  return callRazorpay("/orders", {
    method: "POST",
    body: {
      amount: toCurrencySubunits(amount, currency),
      currency: text(currency).toUpperCase() || "INR",
      receipt,
      notes,
    },
  });
}

function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!isRazorpayConfigured || !orderId || !paymentId || !signature) {
    return false;
  }

  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function getRazorpayCheckoutConfig({ course, order, user }) {
  if (!isRazorpayConfigured || !order?.gatewayOrderId) {
    return null;
  }

  return {
    type: "razorpay",
    scriptUrl: RAZORPAY_CHECKOUT_SCRIPT,
    keyId: RAZORPAY_KEY_ID,
    razorpayOrderId: order.gatewayOrderId,
    amountSubunits: toCurrencySubunits(order.amount, order.currency),
    currency: order.currency || "INR",
    businessName: "Gatemate Learning",
    description: `Purchase access to ${course?.title || "this course"}`,
    themeColor: RAZORPAY_THEME_COLOR,
    prefill: {
      name: user?.name || "",
      email: user?.email || "",
    },
  };
}

module.exports = {
  createGatewayReceipt,
  createRazorpayOrder,
  getPaymentGateway,
  getRazorpayCheckoutConfig,
  isRazorpayConfigured,
  toCurrencySubunits,
  verifyRazorpaySignature,
};
