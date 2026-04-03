const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

// Simple middleware to check JWT
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'nor_perfume_secret_key_123';
const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

router.use(requireAuth);

// Details
router.get('/me', userController.getUserDetails);
router.put('/me', userController.updateUserDetails);
router.put('/password', userController.changePassword);

// Addresses
router.get('/addresses', userController.getAddresses);
router.post('/addresses', userController.addAddress);
router.put('/addresses/:id', userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

// Wishlist
router.get('/wishlist', userController.getWishlist);
router.post('/wishlist', userController.toggleWishlist);

// Orders
router.get('/orders', userController.getOrders);

module.exports = router;
