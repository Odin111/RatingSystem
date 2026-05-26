const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.db');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Initialize Database
const db = new Database(DB_PATH);

// Create Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        originalPassword TEXT,
        role TEXT,
        fullName TEXT,
        position TEXT,
        division TEXT
    );

    CREATE TABLE IF NOT EXISTS applicants (
        name TEXT,
        position TEXT,
        dateAdded TEXT,
        credentials TEXT,
        division TEXT,
        batch TEXT,
        PRIMARY KEY (name, position)
    );

    CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        date TEXT,
        rater TEXT,
        raterPosition TEXT,
        position TEXT,
        applicant TEXT,
        credentials TEXT,
        scores TEXT,
        totalScore REAL,
        maxScore REAL,
        raterUsername TEXT,
        dateOfApplication TEXT,
        division TEXT
    );

    CREATE TABLE IF NOT EXISTS history_applicants (
        name TEXT,
        position TEXT,
        dateAdded TEXT,
        dateDeleted TEXT,
        credentials TEXT,
        division TEXT,
        batch TEXT,
        PRIMARY KEY (name, position)
    );

    CREATE TABLE IF NOT EXISTS history_ratings (
        id TEXT PRIMARY KEY,
        date TEXT,
        rater TEXT,
        raterPosition TEXT,
        position TEXT,
        applicant TEXT,
        credentials TEXT,
        scores TEXT,
        totalScore REAL,
        maxScore REAL,
        dateDeleted TEXT,
        raterUsername TEXT,
        dateOfApplication TEXT,
        division TEXT
    );

    CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        name TEXT,
        dateCreated TEXT
    );
`);

// Add originalPassword column if it doesn't exist (for existing databases)
try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasOriginalPassword = tableInfo.some(col => col.name === 'originalPassword');
    if (!hasOriginalPassword) {
        db.prepare("ALTER TABLE users ADD COLUMN originalPassword TEXT").run();
        console.log('Added originalPassword column to users table.');
    }
    const hasUserDivision = tableInfo.some(col => col.name === 'division');
    if (!hasUserDivision) {
        db.prepare("ALTER TABLE users ADD COLUMN division TEXT").run();
        console.log('Added division column to users table.');
    }

    // Add raterUsername and dateOfApplication to ratings and history_ratings
    const ratingsInfo = db.prepare("PRAGMA table_info(ratings)").all();
    if (!ratingsInfo.some(col => col.name === 'raterUsername')) {
        db.prepare("ALTER TABLE ratings ADD COLUMN raterUsername TEXT").run();
        console.log('Added raterUsername column to ratings table.');
    }
    if (!ratingsInfo.some(col => col.name === 'dateOfApplication')) {
        db.prepare("ALTER TABLE ratings ADD COLUMN dateOfApplication TEXT").run();
        console.log('Added dateOfApplication column to ratings table.');
    }

    const historyRatingsInfo = db.prepare("PRAGMA table_info(history_ratings)").all();
    if (!historyRatingsInfo.some(col => col.name === 'raterUsername')) {
        db.prepare("ALTER TABLE history_ratings ADD COLUMN raterUsername TEXT").run();
        console.log('Added raterUsername column to history_ratings table.');
    }
    if (!historyRatingsInfo.some(col => col.name === 'dateOfApplication')) {
        db.prepare("ALTER TABLE history_ratings ADD COLUMN dateOfApplication TEXT").run();
        console.log('Added dateOfApplication column to history_ratings table.');
    }

    // Add division column to applicants, history_applicants, ratings, history_ratings if they don't exist
    const applicantsInfo = db.prepare("PRAGMA table_info(applicants)").all();
    if (!applicantsInfo.some(col => col.name === 'division')) {
        db.prepare("ALTER TABLE applicants ADD COLUMN division TEXT").run();
        console.log('Added division column to applicants table.');
    }

    const historyApplicantsInfo = db.prepare("PRAGMA table_info(history_applicants)").all();
    if (!historyApplicantsInfo.some(col => col.name === 'division')) {
        db.prepare("ALTER TABLE history_applicants ADD COLUMN division TEXT").run();
        console.log('Added division column to history_applicants table.');
    }

    if (!ratingsInfo.some(col => col.name === 'division')) {
        db.prepare("ALTER TABLE ratings ADD COLUMN division TEXT").run();
        console.log('Added division column to ratings table.');
    }

    if (!historyRatingsInfo.some(col => col.name === 'division')) {
        db.prepare("ALTER TABLE history_ratings ADD COLUMN division TEXT").run();
        console.log('Added division column to history_ratings table.');
    }

    // Add batch column to applicants and history_applicants if they don't exist
    if (!applicantsInfo.some(col => col.name === 'batch')) {
        db.prepare("ALTER TABLE applicants ADD COLUMN batch TEXT").run();
        console.log('Added batch column to applicants table.');
    }

    if (!historyApplicantsInfo.some(col => col.name === 'batch')) {
        db.prepare("ALTER TABLE history_applicants ADD COLUMN batch TEXT").run();
        console.log('Added batch column to history_applicants table.');
    }
} catch (e) {
    console.log('Column migration error:', e.message);
}

// Migration: Add originalPassword values to existing users if they don't have it
try {
    const users = db.prepare('SELECT * FROM users').all();
    users.forEach(user => {
        if (!user.originalPassword) {
            db.prepare('UPDATE users SET originalPassword = ? WHERE username = ?').run(user.password, user.username);
        }
    });
} catch (e) {
    console.log('Migration note:', e.message);
}

// Helper to resolve a batch name from history back to an active batch ID (creating it if needed)
function resolveOrCreateBatchByName(db, batchName) {
    if (!batchName) return null;
    // Check if there is a batch with this name or id
    const existing = db.prepare('SELECT id FROM batches WHERE name = ? COLLATE NOCASE OR id = ?').get(batchName, batchName);
    if (existing) {
        return existing.id;
    }
    // If not found, create a new batch folder with this name
    const newId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
    const dateCreated = new Date().toLocaleDateString();
    db.prepare('INSERT INTO batches (id, name, dateCreated) VALUES (?, ?, ?)').run(newId, batchName, dateCreated);
    return newId;
}

// API Endpoints

// Check if requester is localhost
function isLocalhost(req) {
    const ip = req.connection.remoteAddress || req.ip || '';
    return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('::ffff:127.0.0.1');
}

// Connection mechanism for auto-closing (only tracks host/localhost connections)
let activeLocalConnections = 0;
let shutdownTimer = null;
// Give it 15 seconds initially to open the browser and load the page
let startupGracePeriod = true; 
setTimeout(() => { 
    startupGracePeriod = false; 
    if (activeLocalConnections === 0) {
        console.log('No host browser connected after startup. Shutting down server...');
        process.exit();
    }
}, 15000);

app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('data: connected\n\n');

    const isLocal = isLocalhost(req);
    if (isLocal) {
        activeLocalConnections++;
        if (shutdownTimer) {
            clearTimeout(shutdownTimer);
            shutdownTimer = null;
        }
    }

    const keepAlive = setInterval(() => {
        res.write('data: ping\n\n');
    }, 20000);

    req.on('close', () => {
        clearInterval(keepAlive);
        if (isLocal) {
            activeLocalConnections--;
            if (activeLocalConnections <= 0) {
                activeLocalConnections = 0;
                shutdownTimer = setTimeout(() => {
                    console.log('Host browser disconnected. Shutting down server...');
                    process.exit();
                }, 2000); // Wait 2 seconds for a reconnect (e.g., during page refresh)
            }
        }
    });
});

// 1. All Data (for initialization)
app.get('/api/data', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users').all();
        const applicants = db.prepare('SELECT * FROM applicants').all();
        const ratings = db.prepare('SELECT * FROM ratings').all();
        const history_applicants = db.prepare('SELECT * FROM history_applicants').all();
        const history_ratings = db.prepare('SELECT * FROM history_ratings').all();
        const batches = db.prepare('SELECT * FROM batches').all();

        // Parse JSON strings back to arrays/objects
        applicants.forEach(a => a.credentials = JSON.parse(a.credentials || '[]'));
        history_applicants.forEach(a => a.credentials = JSON.parse(a.credentials || '[]'));
        ratings.forEach(r => {
            r.credentials = JSON.parse(r.credentials || '[]');
            r.scores = JSON.parse(r.scores || '[]');
        });
        history_ratings.forEach(r => {
            r.credentials = JSON.parse(r.credentials || '[]');
            r.scores = JSON.parse(r.scores || '[]');
        });

        res.json({ users, applicants, ratings, history_applicants, history_ratings, batches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Users
app.post('/api/users', (req, res) => {
    const { username, password, role, fullName, position, originalPassword, division } = req.body;
    try {
        db.transaction(() => {
            const stmt = db.prepare('INSERT OR REPLACE INTO users (username, password, originalPassword, role, fullName, position, division) VALUES (?, ?, ?, ?, ?, ?, ?)');
            stmt.run(username, password, originalPassword || password, role, fullName, position, division || null);

            // If it's an employee, update their submitted ratings to reflect the new name/position
            if (role === 'employee' || role === 'admin') {
                db.prepare('UPDATE ratings SET rater = ?, raterPosition = ? WHERE raterUsername = ?').run(fullName, position || 'Employee', username);
                db.prepare('UPDATE history_ratings SET rater = ?, raterPosition = ? WHERE raterUsername = ?').run(fullName, position || 'Employee', username);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:username', (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE username = ?').run(req.params.username);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Applicants
app.post('/api/applicants', (req, res) => {
    const { name, position, dateAdded, credentials, division, batch, oldName, oldPosition } = req.body;
    try {
        db.transaction(() => {
            if (oldName && oldPosition) {
                // Handle Update (Update all related records if name changed)
                db.prepare('UPDATE applicants SET name = ?, position = ?, credentials = ?, division = ?, batch = ? WHERE name = ? AND position = ?')
                  .run(name, position, JSON.stringify(credentials), division || null, batch || null, oldName, oldPosition);
                
                // Cascade name update to other applicants and ratings
                if (name !== oldName) {
                    db.prepare('UPDATE applicants SET name = ? WHERE name = ?').run(name, oldName);
                    db.prepare('UPDATE ratings SET applicant = ? WHERE applicant = ?').run(name, oldName);
                    db.prepare('UPDATE history_applicants SET name = ? WHERE name = ?').run(name, oldName);
                    db.prepare('UPDATE history_ratings SET applicant = ? WHERE applicant = ?').run(name, oldName);
                }

                // Cascade position, division, and credentials updates to ratings
                db.prepare('UPDATE ratings SET position = ?, division = ?, credentials = ? WHERE applicant = ? AND position = ?').run(position, division || null, JSON.stringify(credentials), name, oldPosition);
                db.prepare('UPDATE history_ratings SET position = ?, division = ?, credentials = ? WHERE applicant = ? AND position = ?').run(position, division || null, JSON.stringify(credentials), name, oldPosition);
            } else {
                // Handle Insert
                db.prepare('INSERT OR REPLACE INTO applicants (name, position, dateAdded, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?)')
                  .run(name, position, dateAdded, JSON.stringify(credentials), division || null, batch || null);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/applicants', (req, res) => {
    const { name, position } = req.body;
    try {
        db.transaction(() => {
            const applicant = db.prepare('SELECT * FROM applicants WHERE name = ? AND position = ?').get(name, position);
            if (applicant) {
                const dateDeleted = new Date().toLocaleDateString();
                let batchName = null;
                if (applicant.batch) {
                    const batchRow = db.prepare('SELECT name FROM batches WHERE id = ? OR name = ?').get(applicant.batch, applicant.batch);
                    batchName = batchRow ? batchRow.name : applicant.batch;
                }
                db.prepare('INSERT OR REPLACE INTO history_applicants (name, position, dateAdded, dateDeleted, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?, ?)')
                  .run(applicant.name, applicant.position, applicant.dateAdded, dateDeleted, applicant.credentials, applicant.division, batchName);
                db.prepare('DELETE FROM applicants WHERE name = ? AND position = ?').run(name, position);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/applicants/delete-bulk', (req, res) => {
    const { applicants } = req.body;
    try {
        db.transaction(() => {
            const dateDeleted = new Date().toLocaleDateString();
            const getStmt = db.prepare('SELECT * FROM applicants WHERE name = ? AND position = ?');
            const insertHistoryStmt = db.prepare('INSERT OR REPLACE INTO history_applicants (name, position, dateAdded, dateDeleted, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?, ?)');
            const deleteStmt = db.prepare('DELETE FROM applicants WHERE name = ? AND position = ?');

            for (const { name, position } of applicants) {
                const applicant = getStmt.get(name, position);
                if (applicant) {
                    let batchName = null;
                    if (applicant.batch) {
                        const batchRow = db.prepare('SELECT name FROM batches WHERE id = ? OR name = ?').get(applicant.batch, applicant.batch);
                        batchName = batchRow ? batchRow.name : applicant.batch;
                    }
                    insertHistoryStmt.run(applicant.name, applicant.position, applicant.dateAdded, dateDeleted, applicant.credentials, applicant.division, batchName);
                    deleteStmt.run(name, position);
                }
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/applicants/move-bulk', (req, res) => {
    const { applicants, batchId } = req.body;
    try {
        db.transaction(() => {
            const updateStmt = db.prepare('UPDATE applicants SET batch = ? WHERE name = ? AND position = ?');
            for (const { name, position } of applicants) {
                updateStmt.run(batchId || null, name, position);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/applicants/delete-all', (req, res) => {
    const { batch } = req.query || {};
    try {
        db.transaction(() => {
            let applicants;
            if (batch === 'unbatched') {
                applicants = db.prepare('SELECT * FROM applicants WHERE batch IS NULL OR batch = ""').all();
                db.prepare('DELETE FROM applicants WHERE batch IS NULL OR batch = ""').run();
            } else if (batch) {
                applicants = db.prepare('SELECT * FROM applicants WHERE batch = ?').all();
                db.prepare('DELETE FROM applicants WHERE batch = ?').run(batch);
            } else {
                applicants = db.prepare('SELECT * FROM applicants').all();
                db.prepare('DELETE FROM applicants').run();
            }

            const dateDeleted = new Date().toLocaleDateString();
            const insertStmt = db.prepare('INSERT OR REPLACE INTO history_applicants (name, position, dateAdded, dateDeleted, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?, ?)');
            
            for (const applicant of applicants) {
                let batchName = null;
                if (applicant.batch) {
                    const batchRow = db.prepare('SELECT name FROM batches WHERE id = ? OR name = ?').get(applicant.batch, applicant.batch);
                    batchName = batchRow ? batchRow.name : applicant.batch;
                }
                insertStmt.run(applicant.name, applicant.position, applicant.dateAdded, dateDeleted, applicant.credentials, applicant.division, batchName);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/applicants/sync-credentials', (req, res) => {
    const { name, credentials } = req.body;
    try {
        db.transaction(() => {
            const credsJson = JSON.stringify(credentials);
            // Update all applicants with the same name
            db.prepare('UPDATE applicants SET credentials = ? WHERE name = ? COLLATE NOCASE').run(credsJson, name);
            // Update all ratings with the same applicant name
            db.prepare('UPDATE ratings SET credentials = ? WHERE applicant = ? COLLATE NOCASE').run(credsJson, name);
            // Update history tables too
            db.prepare('UPDATE history_applicants SET credentials = ? WHERE name = ? COLLATE NOCASE').run(credsJson, name);
            db.prepare('UPDATE history_ratings SET credentials = ? WHERE applicant = ? COLLATE NOCASE').run(credsJson, name);
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/applicants/sync-division', (req, res) => {
    const { name, division } = req.body;
    try {
        db.transaction(() => {
            // Update all applicants with the same name
            db.prepare('UPDATE applicants SET division = ? WHERE name = ? COLLATE NOCASE').run(division || null, name);
            // Update all ratings with the same applicant name
            db.prepare('UPDATE ratings SET division = ? WHERE applicant = ? COLLATE NOCASE').run(division || null, name);
            // Update history tables too
            db.prepare('UPDATE history_applicants SET division = ? WHERE name = ? COLLATE NOCASE').run(division || null, name);
            db.prepare('UPDATE history_ratings SET division = ? WHERE applicant = ? COLLATE NOCASE').run(division || null, name);
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3.5 Batches
app.post('/api/batches', (req, res) => {
    const { id, name, dateCreated } = req.body;
    try {
        db.prepare('INSERT OR REPLACE INTO batches (id, name, dateCreated) VALUES (?, ?, ?)').run(id, name, dateCreated);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/batches/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.transaction(() => {
            const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
            if (batch) {
                db.prepare('UPDATE applicants SET batch = NULL WHERE batch = ? OR batch = ?').run(id, batch.name);
                db.prepare('DELETE FROM batches WHERE id = ?').run(id);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/batches/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        db.transaction(() => {
            const oldBatch = db.prepare('SELECT name FROM batches WHERE id = ?').get(id);
            if (!oldBatch) {
                return res.status(404).json({ error: 'Batch not found' });
            }
            db.prepare('UPDATE batches SET name = ? WHERE id = ?').run(name, id);
            db.prepare('UPDATE history_applicants SET batch = ? WHERE batch = ?').run(name, oldBatch.name);
            db.prepare('UPDATE applicants SET batch = ? WHERE batch = ?').run(id, oldBatch.name);
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/batches/:id/delete-all-and-folder', (req, res) => {
    const { id } = req.params;
    try {
        db.transaction(() => {
            const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
            if (batch) {
                const applicants = db.prepare('SELECT * FROM applicants WHERE batch = ? OR batch = ?').all(id, batch.name);
                const dateDeleted = new Date().toLocaleDateString();
                const insertStmt = db.prepare('INSERT OR REPLACE INTO history_applicants (name, position, dateAdded, dateDeleted, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?, ?)');
                
                for (const applicant of applicants) {
                    insertStmt.run(applicant.name, applicant.position, applicant.dateAdded, dateDeleted, applicant.credentials, applicant.division, batch.name);
                }
                
                db.prepare('DELETE FROM applicants WHERE batch = ? OR batch = ?').run(id, batch.name);
                db.prepare('DELETE FROM batches WHERE id = ?').run(id);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/history-folder/:folderName', (req, res) => {
    const { folderName } = req.params;
    try {
        db.prepare('DELETE FROM history_applicants WHERE batch = ?').run(folderName);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/restore-folder', (req, res) => {
    const { folderName } = req.body;
    try {
        db.transaction(() => {
            const batchId = resolveOrCreateBatchByName(db, folderName);
            const items = db.prepare('SELECT * FROM history_applicants WHERE batch = ?').all(folderName);
            const insertStmt = db.prepare('INSERT OR REPLACE INTO applicants (name, position, dateAdded, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?)');
            const deleteStmt = db.prepare('DELETE FROM history_applicants WHERE name = ? AND position = ?');
            
            for (const item of items) {
                insertStmt.run(item.name, item.position, item.dateAdded, item.credentials, item.division, batchId);
                deleteStmt.run(item.name, item.position);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Ratings
app.post('/api/ratings', (req, res) => {
    const ratings = Array.isArray(req.body) ? req.body : [req.body];
    try {
        const stmt = db.prepare('INSERT INTO ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, raterUsername, dateOfApplication, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        db.transaction(() => {
            for (const r of ratings) {
                stmt.run(r.id, r.date, r.rater, r.raterPosition, r.position, r.applicant, JSON.stringify(r.credentials), JSON.stringify(r.scores), r.totalScore, r.maxScore, r.raterUsername, r.dateOfApplication || null, r.division || null);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ratings/delete-all', (req, res) => {
    try {
        const ratings = db.prepare('SELECT * FROM ratings').all();
        if (ratings.length === 0) {
            return res.json({ success: true, message: 'No ratings to delete' });
        }

        const dateDeleted = new Date().toLocaleDateString();
        
        const deleteTx = db.transaction(() => {
            const insertStmt = db.prepare(`
                INSERT OR REPLACE INTO history_ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, dateDeleted, raterUsername, dateOfApplication, division) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const r of ratings) {
                insertStmt.run(
                    r.id, r.date, r.rater, r.raterPosition, 
                    r.position, r.applicant, r.credentials, 
                    r.scores, r.totalScore, r.maxScore, 
                    dateDeleted, r.raterUsername, r.dateOfApplication,
                    r.division
                );
            }
            
            db.prepare('DELETE FROM ratings').run();
        });

        deleteTx();
        res.json({ success: true });
    } catch (err) {
        console.error('Delete All Ratings Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ratings/:id', (req, res) => {
    try {
        db.transaction(() => {
            const rating = db.prepare('SELECT * FROM ratings WHERE id = ?').get(req.params.id);
            if (rating) {
                const dateDeleted = new Date().toLocaleDateString();
                db.prepare('INSERT INTO history_ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, dateDeleted, raterUsername, dateOfApplication, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                  .run(rating.id, rating.date, rating.rater, rating.raterPosition, rating.position, rating.applicant, rating.credentials, rating.scores, rating.totalScore, rating.maxScore, dateDeleted, rating.raterUsername, rating.dateOfApplication, rating.division);
                db.prepare('DELETE FROM ratings WHERE id = ?').run(req.params.id);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ratings/update-date-of-application', (req, res) => {
    const { rater, dateOfApplication } = req.body;
    try {
        db.transaction(() => {
            db.prepare('UPDATE ratings SET dateOfApplication = ? WHERE rater = ?').run(dateOfApplication, rater);
            db.prepare('UPDATE history_ratings SET dateOfApplication = ? WHERE rater = ?').run(dateOfApplication, rater);
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. History Operations
app.post('/api/restore-bulk/:type', (req, res) => {
    const { type } = req.params;
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Missing ids array' });
    }
    try {
        db.transaction(() => {
            if (type === 'rating') {
                const getStmt = db.prepare('SELECT * FROM history_ratings WHERE id = ?');
                const insertStmt = db.prepare('INSERT INTO ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, raterUsername, dateOfApplication, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                const deleteStmt = db.prepare('DELETE FROM history_ratings WHERE id = ?');

                for (const id of ids) {
                    const item = getStmt.get(id);
                    if (item) {
                        insertStmt.run(item.id, item.date, item.rater, item.raterPosition, item.position, item.applicant, item.credentials, item.scores, item.totalScore, item.maxScore, item.raterUsername, item.dateOfApplication, item.division);
                        deleteStmt.run(id);
                    }
                }
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/restore/:type', (req, res) => {
    const { type } = req.params;
    const { name, position, id } = req.body;
    try {
        db.transaction(() => {
            if (type === 'applicant') {
                const item = db.prepare('SELECT * FROM history_applicants WHERE name = ? AND position = ?').get(name, position);
                if (item) {
                    const batchId = resolveOrCreateBatchByName(db, item.batch);
                    db.prepare('INSERT OR REPLACE INTO applicants (name, position, dateAdded, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?)')
                      .run(item.name, item.position, item.dateAdded, item.credentials, item.division, batchId);
                    db.prepare('DELETE FROM history_applicants WHERE name = ? AND position = ?').run(name, position);
                }
            } else if (type === 'rating') {
                const item = db.prepare('SELECT * FROM history_ratings WHERE id = ?').get(id);
                if (item) {
                    db.prepare('INSERT INTO ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, raterUsername, dateOfApplication, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                      .run(item.id, item.date, item.rater, item.raterPosition, item.position, item.applicant, item.credentials, item.scores, item.totalScore, item.maxScore, item.raterUsername, item.dateOfApplication, item.division);
                    db.prepare('DELETE FROM history_ratings WHERE id = ?').run(id);
                }
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/restore-all/:type', (req, res) => {
    const { type } = req.params;
    const { overwrite } = req.body;
    try {
        db.transaction(() => {
            if (type === 'applicants') {
                const items = db.prepare('SELECT * FROM history_applicants').all();
                for (const item of items) {
                    if (overwrite === false) {
                        const exists = db.prepare('SELECT 1 FROM applicants WHERE name = ? AND position = ?').get(item.name, item.position);
                        if (exists) continue;
                    }
                    const batchId = resolveOrCreateBatchByName(db, item.batch);
                    db.prepare('INSERT OR REPLACE INTO applicants (name, position, dateAdded, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?)')
                      .run(item.name, item.position, item.dateAdded, item.credentials, item.division, batchId);
                }
                db.prepare('DELETE FROM history_applicants').run();
            } else if (type === 'ratings') {
                const items = db.prepare('SELECT * FROM history_ratings').all();
                for (const item of items) {
                    if (overwrite === false) {
                        const exists = db.prepare('SELECT 1 FROM ratings WHERE rater = ? AND applicant = ? AND position = ?').get(item.rater, item.applicant, item.position);
                        if (exists) continue;
                    } else if (overwrite === true) {
                        db.prepare('DELETE FROM ratings WHERE rater = ? AND applicant = ? AND position = ?').run(item.rater, item.applicant, item.position);
                    }
                    
                    // Use INSERT OR REPLACE for ratings too if possible, but keep original ID
                    db.prepare('INSERT OR REPLACE INTO ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, raterUsername, dateOfApplication, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                      .run(item.id, item.date, item.rater, item.raterPosition, item.position, item.applicant, item.credentials, item.scores, item.totalScore, item.maxScore, item.raterUsername, item.dateOfApplication, item.division);
                }
                db.prepare('DELETE FROM history_ratings').run();
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/history/delete-bulk', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Missing ids array' });
    }
    try {
        const stmt = db.prepare('DELETE FROM history_ratings WHERE id = ?');
        db.transaction(() => {
            for (const id of ids) {
                stmt.run(id);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/history/:type/:id', (req, res) => {
    const { type, id } = req.params;
    try {
        if (type === 'rating') {
            db.prepare('DELETE FROM history_ratings WHERE id = ?').run(id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/history-applicant', (req, res) => {
    const { name, position } = req.body;
    try {
        db.prepare('DELETE FROM history_applicants WHERE name = ? AND position = ?').run(name, position);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/clear-history/:type', (req, res) => {
    const { type } = req.params;
    try {
        if (type === 'applicants') db.prepare('DELETE FROM history_applicants').run();
        else if (type === 'ratings') db.prepare('DELETE FROM history_ratings').run();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Bulk Operations
app.delete('/api/clear-all', (req, res) => {
    try {
        db.transaction(() => {
            db.prepare('DELETE FROM applicants').run();
            db.prepare('DELETE FROM ratings').run();
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Migration helper: Receive all localStorage data and populate DB
app.post('/api/migrate', (req, res) => {
    const { users, applicants, ratings, deletedRatings, deletedApplicants } = req.body;
    try {
        db.transaction(() => {
            if (users) {
                const stmt = db.prepare('INSERT OR REPLACE INTO users (username, password, role, fullName, position) VALUES (?, ?, ?, ?, ?)');
                users.forEach(u => stmt.run(u.username, u.password, u.role, u.fullName, u.position));
            }
            if (applicants) {
                const stmt = db.prepare('INSERT OR REPLACE INTO applicants (name, position, dateAdded, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?)');
                applicants.forEach(a => stmt.run(a.name, a.position, a.dateAdded, JSON.stringify(a.credentials), a.division || null, a.batch || null));
            }
            if (ratings) {
                const stmt = db.prepare('INSERT OR REPLACE INTO ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, raterUsername, dateOfApplication, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                ratings.forEach(r => stmt.run(r.id, r.date, r.rater, r.raterPosition, r.position, r.applicant, JSON.stringify(r.credentials), JSON.stringify(r.scores), r.totalScore, r.maxScore, r.raterUsername, r.dateOfApplication || null, r.division || null));
            }
            if (deletedApplicants) {
                const stmt = db.prepare('INSERT OR REPLACE INTO history_applicants (name, position, dateAdded, dateDeleted, credentials, division, batch) VALUES (?, ?, ?, ?, ?, ?, ?)');
                deletedApplicants.forEach(a => stmt.run(a.name, a.position, a.dateAdded, a.dateDeleted || new Date().toLocaleDateString(), JSON.stringify(a.credentials), a.division || null, a.batch || null));
            }
            if (deletedRatings) {
                const stmt = db.prepare('INSERT OR REPLACE INTO history_ratings (id, date, rater, raterPosition, position, applicant, credentials, scores, totalScore, maxScore, dateDeleted, raterUsername, dateOfApplication, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                deletedRatings.forEach(r => stmt.run(r.id, r.date, r.rater, r.raterPosition, r.position, r.applicant, JSON.stringify(r.credentials), JSON.stringify(r.scores), r.totalScore, r.maxScore, r.dateDeleted || new Date().toLocaleDateString(), r.raterUsername, r.dateOfApplication || null, r.division || null));
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIps = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIps.push(iface.address);
            }
        }
    }

    console.log('==============================================');
    console.log('Rating System Server Running');
    console.log('==============================================');
    console.log(`Host URL:   http://localhost:${PORT}`);
    console.log(`Access URLs on other devices (same WiFi/LAN):`);
    if (localIps.length === 0) {
        console.log(`   (No local network IP found)`);
    } else {
        localIps.forEach(ip => {
            console.log(`   http://${ip}:${PORT}`);
        });
    }
    console.log('==============================================');
    console.log('Press Ctrl+C to stop, or close the host browser tab to auto-stop');
    console.log('==============================================');
    
    // Auto-open browser
    const startUrl = `http://localhost:${PORT}`;
    const startCommand = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
    exec(`${startCommand} ${startUrl}`);
});

// Prevent immediate exit on Ctrl+C and handle termination gracefully
const readline = require('readline');
let isClosing = false;

process.on('SIGINT', () => {
    if (isClosing) return;
    isClosing = true;
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log('');
    rl.question('Are you sure you want to close the server? (y/n): ', (answer) => {
        if (answer.trim().toLowerCase() === 'y') {
            console.log('Shutting down server...');
            process.exit(0);
        } else {
            console.log('Server continues to run.');
            rl.close();
            isClosing = false;
        }
    });
});
