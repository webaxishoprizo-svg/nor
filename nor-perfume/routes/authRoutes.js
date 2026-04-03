const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { error: "Too many requests from this IP, please try again in 15 minutes." }
});

router.post('/register', authLimiter, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], authController.register);

router.post('/login', authLimiter, [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password cannot be empty')
], authController.login);

router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/google', authLimiter, authController.googleLogin);

module.exports = router;
