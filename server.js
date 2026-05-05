require('dotenv').config(); // ✅ Loads .env automatically

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ⚠️ REPLACE with your Razorpay Test Keys
// Get them from: https://dashboard.razorpay.com/app/keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SlZQa4VnL4laOg",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "K1c8FpB6vsTD29j6ICOVzQt6",
});

// ✅ Route: Create Order
app.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpay.key_id,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Route: Verify Payment
app.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Generate expected signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", razorpay.key_secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      res.json({
        success: true,
        message: "Payment verified successfully!",
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed!",
      });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Route: Get all orders (for testing)
app.get("/orders", async (req, res) => {
  try {
    const orders = await razorpay.orders.all({ count: 10 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📖 Open the page: http://localhost:${PORT}/index.html\n`);
});