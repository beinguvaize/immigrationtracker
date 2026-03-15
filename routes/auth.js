const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prepare } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existing = await prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // First user becomes admin, rest are regular users
        const userCount = await prepare('SELECT COUNT(*) as c FROM users').get();
        const role = (userCount && userCount.c === 0) ? 'admin' : 'user';

        const passwordHash = await bcrypt.hash(password, 12);
        const result = await prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, passwordHash, role);

        const token = jwt.sign({ id: result.lastInsertRowid, email, role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user: { id: result.lastInsertRowid, email, role } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
if (!valid) {
            try {
                await prepare('INSERT INTO login_activity (user_id, email, type, success, ip_address) VALUES (?, ?, ?, ?, ?)')
                    .run(user.id, email, 'failed_login', 0, ip);
            } catch(e) { console.warn('[Auth] blocked:', e.message); }
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        try {
            const now = new Date().toISOString();
            await prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);
        } catch(e) { console.warn('[Auth] blocked:', e.message); }
        try {
            await prepare('INSERT INTO login_activity (user_id, email, type, success, ip_address) VALUES (?, ?, ?, ?, ?)')
                .run(user.id, email, 'login', 1, ip);
        } catch(e) { console.warn('[Auth] blocked:', e.message); }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });


    }
});

module.exports = router;
