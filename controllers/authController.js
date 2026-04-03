const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const db = require('../models/db');
const { sendEmailLog } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const JWT_SECRET = process.env.JWT_SECRET || 'nor_perfume_secret_key_123';

exports.register = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });

    const { name, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword], function(err) {
        if (err) return res.status(400).json({ error: "Email already exists" });
        
        sendEmailLog(email, "Account Created | NOR Perfume", `<h2>Welcome ${name}!</h2><p>Your NOR Perfume premium account has been created successfully.</p>`);
        
        const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
        
        res.status(200).json({ status: "success", user: { name, email } });
    });
};

exports.login = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });

    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err || !row) return res.status(401).json({ error: "Invalid credentials" });
        
        const isMatch = bcrypt.compareSync(password, row.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: row.id, email: row.email, name: row.name }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.status(200).json({ status: "success", user: { name: row.name, email: row.email } });
    });
};

exports.me = (req, res) => {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({ status: "success", user: { name: decoded.name, email: decoded.email } });
    } catch (err) {
        res.clearCookie('jwt');
        res.status(401).json({ error: "Invalid token" });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('jwt');
    res.status(200).json({ status: "success" });
};

exports.forgotPassword = (req, res) => {
    const { email } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Account not found" });
        
        sendEmailLog(email, "Password Reset | NOR Perfume", `<h2>Reset your password</h2><p>Hi ${row.name}, click here to reset your password. (Mock Link)</p>`);
        res.status(200).json({ status: "success" });
    });
};

exports.googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: "Missing Google credential" });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, sub: google_id } = payload;

        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) return res.status(500).json({ error: "Database error" });

            if (row) {
                const token = jwt.sign({ id: row.id, email: row.email, name: row.name }, JWT_SECRET, { expiresIn: '7d' });
                res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
                return res.status(200).json({ status: "success", user: { name: row.name, email: row.email } });
            } else {
                const dummyPassword = bcrypt.hashSync(google_id + Math.random(), 10);
                db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, dummyPassword], function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: "Failed to create account" });
                    
                    sendEmailLog(email, "Welcome to NOR Perfume via Google", `<h2>Welcome ${name}!</h2><p>Your account was successfully created securely using Google Sign-In.</p>`);
                    
                    const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET, { expiresIn: '7d' });
                    res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
                    return res.status(200).json({ status: "success", user: { name, email } });
                });
            }
        });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ error: "Invalid Google Token" });
    }
};
