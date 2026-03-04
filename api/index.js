/**
 * Vercel Serverless Entry Point
 * Wraps the Express app for deployment on Vercel.
 */
require('dotenv').config();

const express = require('express');
const path = require('path');

const { initDB } = require('../db');
const authRoutes = require('../routes/auth');
const applicationRoutes = require('../routes/applications');
const statsRoutes = require('../routes/stats');
const adminRoutes = require('../routes/admin');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// ── SPA Fallback ─────────────────────────────────────────────────────────── 
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ── DB Init (lazy, once per cold start) ─────────────────────────────────────
let dbReady = false;
let dbInitPromise = null;
let dbError = null;

async function ensureDB() {
    if (dbReady) return;
    if (dbError) throw dbError;
    if (!dbInitPromise) {
        dbInitPromise = initDB()
            .then(async () => {
                dbReady = true;
                // Seed only if no data yet (idempotent)
                try {
                    const { seedDatabase } = require('../services/seeder');
                    await seedDatabase();
                } catch (e) {
                    // Non-fatal — seeder errors don't block the app
                    console.error('[Boot] Seeder error (non-fatal):', e.message);
                }
            })
            .catch(err => {
                dbError = err;
                dbInitPromise = null; // allow retry
                throw err;
            });
    }
    return dbInitPromise;
}

// ── Exported handler ─────────────────────────────────────────────────────────
module.exports = async (req, res) => {
    try {
        await ensureDB();
    } catch (err) {
        console.error('[Handler] DB init failed:', err.message);
        return res.status(500).json({
            error: 'Database connection failed',
            message: err.message,
            hint: 'Make sure DATABASE_URL and TURSO_AUTH_TOKEN are set in Vercel environment variables'
        });
    }
    return app(req, res);
};
