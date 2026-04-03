require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// Modular Imports
const db = require('./models/db');
const { sendEmailLog } = require('./utils/email');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Custom middleware to serve mask.html as a fallback for missing .html files (Universal Product Template)
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const filePath = path.join(__dirname, 'public', req.path);
        if (!fs.existsSync(filePath)) {
            // Serve the master product template instead of 404
            return res.sendFile(path.join(__dirname, 'public', 'product.html'));

        }
    }
    next();
});

app.use(express.static('public'));

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Newsletter
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    db.run(`INSERT INTO subscribers (email) VALUES (?)`, [email], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(200).json({ status: "already_subscribed" });
            }
            return res.status(500).json({ error: "Database error" });
        }
        
        sendEmailLog(email, "Welcome to the world of NOR", "<h2>Thank you for subscribing!</h2><p>Experience the ultimate luxury car fragrances...</p>");
        res.status(200).json({ status: "success" });
    });
});

// Order Tracking
app.post('/api/track-order', (req, res) => {
    const { order_number, email } = req.body;
    db.get(`SELECT * FROM orders WHERE order_number = ? AND email = ?`, [order_number, email], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Order Not Found" });
        res.status(200).json({ status: "success", order: row });
    });
});

// Shopify Headless Architecture:
// All product, cart, and checkout logic is handled via the Shopify Storefront API on the front-end.
// Checkout redirects directly to Shopify's secure checkout page.

app.listen(PORT, () => {
    console.log(`✅ NOR Perfume Backend running on http://localhost:${PORT}`);
});
