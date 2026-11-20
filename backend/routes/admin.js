
const express = require("express");
const router = express.Router();

const { verifyToken, verifyAdmin } = require("../middleware/auth");

// Protected admin dashboard
router.get("/dashboard", verifyToken, verifyAdmin, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to THE GRAND TABLE Admin Dashboard!",
        admin: req.user
    });
});

module.exports = router;
