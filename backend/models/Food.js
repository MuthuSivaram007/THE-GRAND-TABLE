
const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            enum: ["Indian", "Chinese", "Italian"],
            required: true
        },

        type: {
            type: String,
            enum: ["Veg", "Non-Veg"],
            required: true
        },

        description: {
            type: String,
            required: true
        },

        price: {
            type: Number,
            required: true,
            min: 1
        },

        image: {
            type: String,
            default: "assets/indian-food.png"
        },

        tag: {
            type: String,
            default: "Popular"
        },

        available: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Food", foodSchema);
