const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
}

// Database file path
const dbPath = path.join(dataDir, 'video2tool.db');
console.log('Database path:', dbPath);

// SQL statements
const CREATE_USERS_TABLE = "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)";
const CREATE_VIDEOS_TABLE = "CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, url TEXT NOT NULL, thumbnail_url TEXT, duration INTEGER, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))";
const CREATE_SPECS_TABLE = "CREATE TABLE IF NOT EXISTS specifications (id TEXT PRIMARY KEY, video_id TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (video_id) REFERENCES videos (id))";
const CREATE_TASKS_TABLE = "CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, video_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'todo', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (video_id) REFERENCES videos (id))";

// Initialize database
function initDb() {
    console.log('Initializing database...');

    // Open database connection
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            process.exit(1);
        }
        console.log('Connected to SQLite database');
    });

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
            console.error('Error enabling foreign keys:', err.message);
        } else {
            console.log('Foreign keys enabled');
        }
    });

    // Create tables
    console.log('Creating tables...');

    // Create users table
    db.run(CREATE_USERS_TABLE, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table created');
        }
    });

    // Create videos table
    db.run(CREATE_VIDEOS_TABLE, (err) => {
        if (err) {
            console.error('Error creating videos table:', err.message);
        } else {
            console.log('Videos table created');
        }
    });

    // Create specifications table
    db.run(CREATE_SPECS_TABLE, (err) => {
        if (err) {
            console.error('Error creating specifications table:', err.message);
        } else {
            console.log('Specifications table created');
        }
    });

    // Create tasks table
    db.run(CREATE_TASKS_TABLE, (err) => {
        if (err) {
            console.error('Error creating tasks table:', err.message);
        } else {
            console.log('Tasks table created');
        }
    });

    // Close database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database initialized successfully');
        }
    });
}

// Run initialization
initDb();
