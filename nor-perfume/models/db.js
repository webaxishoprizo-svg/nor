const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite'); 

db.serialize(() => {
    // Subscribers
    db.run(`CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add phone column if it doesn't exist securely using a try-catch equivalent in SQLite PRAGMA or just ignore the error.
    db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => {
        // Will error if column already exists; safely ignore.
    });

    // Addresses
    db.run(`CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        address_text TEXT,
        is_default INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Wishlist
    db.run(`CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, product_id)
    )`);

    // Orders
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        order_number TEXT PRIMARY KEY,
        email TEXT,
        status TEXT,
        items TEXT,
        total REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Mock initial data if empty
    db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO orders (order_number, email, status, total) VALUES (?, ?, ?, ?)");
            stmt.run("NOR12345", "test@example.com", "Shipped - Out for Delivery", 149.99);
            stmt.run("NOR999", "admin@norperfume.com", "Processing", 299.99);
            stmt.finalize();
        }
    });
});

module.exports = db;
