/**
 * Vercel Serverless Entry Point
 * Wraps the Express app for deployment on Vercel.
 * The seeder and automation run lazily (once per cold start) and are safe
 * in a serverless environment because they only use the Turso HTTP client.
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

// ── SPA Fallback ────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ── DB Init + optional lazy seed (runs once per cold start) ─────────────────
let dbReady = false;
let dbInitPromise = null;

async function ensureDB() {
    if (dbReady) return;
    if (!dbInitPromise) {
        dbInitPromise = initDB().then(async () => {
            dbReady = true;
            // Only seed if this is a cold start (no-op if data exists)
            try {
                const { seedDatabase } = require('../services/seeder');
                await seedDatabase();
            } catch (e) {
                console.error('[Boot] Seeder error:', e.message);
            }
        });
    }
    return dbInitPromise;
}

// Wrap handler: ensure DB is ready before serving any request
module.exports = async (req, res) => {
    await ensureDB();
    return app(req, res);
};
