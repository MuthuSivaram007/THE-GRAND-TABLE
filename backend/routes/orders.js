
const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const User = require("../models/User");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// CUSTOMER: Place a new order
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Customers only" });
    }

    const { items, total, deliveryAddress, paymentMethod, paymentStatus } = req.body;

    if (!items || items.length === 0 || !deliveryAddress) {
      return res.status(400).json({
        message: "Order items and delivery address are required"
      });
    }

    const allowedPaymentMethods = [
      "UPI",
      "Credit/Debit Card",
      "Net Banking",
      "Cash on Delivery (COD)"
    ];

    const selectedPaymentMethod = paymentMethod || "Cash on Delivery (COD)";

    if (!allowedPaymentMethods.includes(selectedPaymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method selected"
      });
    }

    // Determine initial payment status securely:
    // - For COD, automatically set payment status to Pending.
    // - Customer cannot set real "Paid" status without real gateway verification.
    // - "Demo Paid" is recorded for demo simulated payments.
    // - Default to "Pending".
    let initialPaymentStatus = "Pending";
    if (selectedPaymentMethod === "Cash on Delivery (COD)") {
      initialPaymentStatus = "Pending";
    } else if (paymentStatus === "Demo Paid") {
      initialPaymentStatus = "Demo Paid";
    } else {
      initialPaymentStatus = "Pending";
    }

    const customer = await User.findById(req.user.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const order = new Order({
      customer: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      items: items.map((item) => ({
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity)
      })),
      total: Number(total),
      deliveryAddress,
      status: "Pending",
      paymentMethod: selectedPaymentMethod,
      paymentStatus: initialPaymentStatus
    });

    await order.save();

    res.status(201).json({
      message: "Order placed successfully",
      order
    });
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// CUSTOMER: View their own orders
router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user.id
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your orders" });
  }
});

// ADMIN: View all customer orders
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ADMIN: Update order status
router.patch("/:id/status", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const allowedStatuses = [
      "Pending",
      "Preparing",
      "Out for Delivery",
      "Delivered",
      "Cancelled"
    ];

    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Order status updated",
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update order status" });
  }
});

// ADMIN: Update order payment status
router.patch("/:id/payment-status", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const allowedPaymentStatuses = [
      "Pending",
      "Demo Paid",
      "Paid",
      "Failed"
    ];

    const { paymentStatus } = req.body;

    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Payment status updated successfully",
      order
    });
  } catch (error) {
    console.error("Payment status update error:", error);
    res.status(500).json({ message: "Failed to update payment status" });
  }
});

module.exports = router;
