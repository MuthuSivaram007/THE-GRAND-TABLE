
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        customerName: {
            type: String,
            required: true
        },

        customerEmail: {
            type: String,
            required: true
        },

        items: [
            {
                name: {
                    type: String,
                    required: true
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],

        total: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Preparing",
                "Out for Delivery",
                "Delivered",
                "Cancelled"
            ],
            default: "Pending"
        },

        paymentMethod: {
            type: String,
            enum: [
                "UPI",
                "Credit/Debit Card",
                "Net Banking",
                "Cash on Delivery (COD)"
            ],
            default: "Cash on Delivery (COD)",
            required: true
        },

        paymentStatus: {
            type: String,
            enum: [
                "Pending",
                "Demo Paid",
                "Paid",
                "Failed"
            ],
            default: "Pending",
            required: true
        },

        deliveryAddress: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Order", orderSchema);
