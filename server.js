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

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!KEY_ID || !KEY_SECRET) {
  console.error("ERROR: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set as environment variables.");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
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
      key: KEY_ID,
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
      .createHmac("sha256", KEY_SECRET)
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