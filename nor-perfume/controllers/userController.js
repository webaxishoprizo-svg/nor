const db = require('../models/db');
const bcrypt = require('bcryptjs');

exports.getUserDetails = (req, res) => {
    db.get('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "User not found" });
        res.status(200).json({ status: "success", user: row });
    });
};

exports.updateUserDetails = (req, res) => {
    const { name, phone } = req.body;
    db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: "Failed to update profile" });
        res.status(200).json({ status: "success" });
    });
};

exports.changePassword = (req, res) => {
    const { oldPassword, newPassword } = req.body;
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "User not found" });
        
        if (!bcrypt.compareSync(oldPassword, row.password)) {
            return res.status(400).json({ error: "Incorrect current password" });
        }
        
        const hash = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: "Failed to update password" });
            res.status(200).json({ status: "success" });
        });
    });
};

exports.getAddresses = (req, res) => {
    db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch addresses" });
        res.status(200).json({ status: "success", addresses: rows });
    });
};

exports.addAddress = (req, res) => {
    const { name, address_text, is_default } = req.body;
    db.run('INSERT INTO addresses (user_id, name, address_text, is_default) VALUES (?, ?, ?, ?)', 
        [req.user.id, name, address_text, is_default ? 1 : 0], function(err) {
            if (err) return res.status(500).json({ error: "Failed to add address" });
            
            if (is_default) {
                db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?', [req.user.id, this.lastID]);
            }
            res.status(200).json({ status: "success", id: this.lastID });
    });
};

exports.updateAddress = (req, res) => {
    const { name, address_text, is_default } = req.body;
    db.run('UPDATE addresses SET name = ?, address_text = ?, is_default = ? WHERE id = ? AND user_id = ?', 
        [name, address_text, is_default ? 1 : 0, req.params.id, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: "Failed to update address" });
            
            if (is_default) {
                db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?', [req.user.id, req.params.id]);
            }
            res.status(200).json({ status: "success" });
    });
};

exports.deleteAddress = (req, res) => {
    db.run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: "Failed to delete address" });
        res.status(200).json({ status: "success" });
    });
};

exports.getWishlist = (req, res) => {
    db.all('SELECT product_id FROM wishlist WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch wishlist" });
        res.status(200).json({ status: "success", wishlist: rows.map(r => r.product_id) });
    });
};

exports.toggleWishlist = (req, res) => {
    const { product_id } = req.body;
    db.get('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id], (err, row) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (row) {
            db.run('DELETE FROM wishlist WHERE id = ?', [row.id], (err) => {
                if(err) return res.status(500).json({ error: "Failed to remove wishlist item" });
                res.status(200).json({ status: "removed" });
            });
        } else {
            db.run('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id], (err) => {
                if(err) return res.status(500).json({ error: "Failed to add wishlist item" });
                res.status(200).json({ status: "added" });
            });
        }
    });
};

exports.getOrders = (req, res) => {
    db.all('SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC', [req.user.email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch orders" });
        res.status(200).json({ status: "success", orders: rows });
    });
};
