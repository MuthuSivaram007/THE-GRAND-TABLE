
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword || adminPassword.length < 12) {
            throw new Error("Set ADMIN_EMAIL and a password of at least 12 characters in .env");
        }

        const existingUser = await User.findOne({
            email: adminEmail.toLowerCase().trim()
        });

        if (existingUser) {
            console.log("This email already exists. Choose a separate admin email.");
            return;
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        await User.create({
            name: "Grand Table Administrator",
            email: adminEmail.toLowerCase().trim(),
            password: hashedPassword,
            role: "admin"
        });

        console.log("Admin account created successfully!");

    } catch (error) {
        console.error("Admin creation failed:", error.message);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();
