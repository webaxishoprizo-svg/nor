let db;
try {
    const sqlite3 = require('sqlite3').verbose();
    const sourceDbPath = path.join(process.cwd(), 'database.sqlite');
    const dbPath = process.env.VERCEL ? path.join('/tmp', 'database.sqlite') : sourceDbPath;

    // Use try-catch for file system operations
    if (process.env.VERCEL && fs.existsSync(sourceDbPath) && !fs.existsSync(dbPath)) {
        try {
            fs.copyFileSync(sourceDbPath, dbPath);
        } catch (copyErr) {
            console.error("Database copy to /tmp failed:", copyErr);
        }
    }

    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Database connection failed:", err);
            // Fallback to in-memory if disk is truly unavailable
            db = new sqlite3.Database(':memory:');
        }
    });

    db.serialize(() => {
        try {
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

            // Add phone column safely
            db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => { /* ignore */ });

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

            // Mock initial data
            db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO orders (order_number, email, status, total) VALUES (?, ?, ?, ?)");
                    stmt.run("NOR12345", "test@example.com", "Shipped - Out for Delivery", 149.99);
                    stmt.run("NOR999", "admin@norperfume.com", "Processing", 299.99);
                    stmt.finalize();
                }
            });
        } catch (initErr) {
            console.error("Database schema initialization failed:", initErr);
        }
    });
} catch (globalErr) {
    console.error("CRITICAL: Database module initialization failed entirely:", globalErr);
    // Minimal fallback object to prevent calling .run() on undefined
    db = {
        run: (s, p, c) => { if(c) c(new Error("Database not available")); },
        get: (s, p, c) => { if(c) c(new Error("Database not available")); },
        prepare: () => ({ run: () => {}, finalize: () => {} }),
        serialize: (cb) => cb()
    };
}

module.exports = db;
