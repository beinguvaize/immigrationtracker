const express = require('express');
const { prepare, saveDB } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require auth + admin role
router.use(authenticateToken, requireAdmin);

// ===== DASHBOARD STATS =====
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await prepare('SELECT COUNT(*) as c FROM users WHERE id > 0').get();
        const totalApps = await prepare('SELECT COUNT(*) as c FROM applications').get();
        const activeApps = await prepare("SELECT COUNT(*) as c FROM applications WHERE status IN ('Submitted', 'Pending')").get();
        const nominatedApps = await prepare("SELECT COUNT(*) as c FROM applications WHERE status IN ('Nominated', 'Endorsed')").get();
        const refusedApps = await prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'Refused'").get();

        const avgWaiting = await prepare('SELECT ROUND(AVG(waiting_months), 1) as avg FROM applications').get();
        const riskCritical = await prepare("SELECT COUNT(*) as c FROM applications WHERE risk_level IN ('red', 'expired')").get();

        // Recent registrations (last 7 days)
        const recentUsers = await prepare(`
      SELECT id, email, role, created_at
      FROM users WHERE id > 0
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

        // Program distribution
        const programDist = await prepare(`
      SELECT program_type, COUNT(*) as count
      FROM applications
      GROUP BY program_type
    `).all();

        res.json({
            totalUsers: totalUsers?.c || 0,
            totalApplications: totalApps?.c || 0,
            activeApplications: activeApps?.c || 0,
            nominatedApplications: nominatedApps?.c || 0,
            refusedApplications: refusedApps?.c || 0,
            avgWaitingMonths: avgWaiting?.avg || 0,
            criticalRisk: riskCritical?.c || 0,
            recentUsers,
            programDistribution: programDist
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== USER MANAGEMENT =====
router.get('/users', async (req, res) => {
    try {
        const { search, role, page, limit: queryLimit } = req.query;

        let whereClause = 'WHERE id > 0';
        const params = [];

        if (search) {
            whereClause += ' AND email LIKE ?';
            params.push(`%${search}%`);
        }
        if (role) {
            whereClause += ' AND role = ?';
            params.push(role);
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(10, parseInt(queryLimit) || 25));
        const offset = (pageNum - 1) * limitNum;

        const total = await prepare(`SELECT COUNT(*) as c FROM users ${whereClause}`).get(...params);

        const users = await prepare(`
      SELECT u.id, u.email, u.role, u.created_at,
        (SELECT COUNT(*) FROM applications WHERE user_id = u.id) as app_count
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `).all(...params);

        res.json({
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: total?.c || 0,
                totalPages: total ? Math.ceil(total.c / limitNum) : 0
            }
        });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Prevent demoting self
        if (parseInt(id) === req.user.id && role !== 'admin') {
            return res.status(400).json({ error: 'Cannot demote yourself' });
        }

        await prepare('UPDATE users SET role = ? WHERE id = ?').run(role, parseInt(id));
        res.json({ message: 'Role updated' });
    } catch (err) {
        console.error('Admin update role error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        // Delete user's applications first
        await prepare('DELETE FROM applications WHERE user_id = ?').run(parseInt(id));
        const result = await prepare('DELETE FROM users WHERE id = ?').run(parseInt(id));

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ALL APPLICATIONS (admin view) =====
router.get('/applications', async (req, res) => {
    try {
        const { program_type, stream, noc_code, status, ns_graduate, search, page, limit: queryLimit } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (program_type) {
            whereClause += ' AND a.program_type = ?';
            params.push(program_type);
        }
        if (stream) {
            whereClause += ' AND a.stream = ?';
            params.push(stream);
        }
        if (noc_code) {
            whereClause += ' AND a.noc_code = ?';
            params.push(noc_code);
        }
        if (status) {
            whereClause += ' AND a.status = ?';
            params.push(status);
        }
        if (search) {
            whereClause += ' AND u.email LIKE ?';
            params.push(`%${search}%`);
        }
        if (ns_graduate !== undefined && ns_graduate !== '') {
            whereClause += ' AND a.ns_graduate = ?';
            params.push(ns_graduate === 'true' ? 1 : 0);
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(10, parseInt(queryLimit) || 25));
        const offset = (pageNum - 1) * limitNum;

        const total = await prepare(`
      SELECT COUNT(*) as c
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
    `).get(...params);

        const apps = await prepare(`
      SELECT a.*, u.email as user_email
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `).all(...params);

        res.json({
            applications: apps,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: total?.c || 0,
                totalPages: total ? Math.ceil(total.c / limitNum) : 0
            }
        });
    } catch (err) {
        console.error('Admin applications error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Edit application (admin)
router.put('/applications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            program_type,
            stream,
            noc_code,
            submission_date,
            work_permit_expiry,
            status,
            status_note,
            ns_graduate,
            has_case_number,
            case_number_date
        } = req.body;

        const result = await prepare(`
            UPDATE applications 
            SET program_type = ?, 
                stream = ?, 
                noc_code = ?, 
                submission_date = ?, 
                work_permit_expiry = ?, 
                status = ?, 
                status_note = ?, 
                ns_graduate = ?,
                has_case_number = ?,
                case_number_date = ?
            WHERE id = ?
        `).run(
            program_type, stream, noc_code, submission_date, work_permit_expiry,
            status, status_note, ns_graduate ? 1 : 0, has_case_number ? 1 : 0, case_number_date,
            parseInt(id)
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ message: 'Application updated' });
    } catch (err) {
        console.error('Admin edit application error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk update status (admin)
router.put('/applications/bulk-status', async (req, res) => {
    try {
        const { appIds, status } = req.body;
        if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
            return res.status(400).json({ error: 'No applications selected' });
        }
        if (!['Submitted', 'Pending', 'Nominated', 'Endorsed', 'Refused'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const placeholders = appIds.map(() => '?').join(',');
        await prepare(`UPDATE applications SET status = ? WHERE id IN (${placeholders})`).run(status, ...appIds);

        res.json({ message: 'Applications updated successfully' });
    } catch (err) {
        console.error('Admin bulk status error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/applications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await prepare('DELETE FROM applications WHERE id = ?').run(parseInt(id));

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        saveDB();
        res.json({ message: 'Application deleted' });
    } catch (err) {
        console.error('Admin delete application error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ANNOUNCEMENTS =====
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
        res.json({ announcements });
    } catch (err) {
        console.error('Admin get announcements error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/announcements', async (req, res) => {
    try {
        const { message, active } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        const isActive = active !== undefined ? active : 1;
        await prepare('INSERT INTO announcements (message, active) VALUES (?, ?)').run(message, isActive ? 1 : 0);
        res.json({ message: 'Announcement created' });
    } catch (err) {
        console.error('Admin create announcement error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/announcements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        await prepare('UPDATE announcements SET active = ? WHERE id = ?').run(active ? 1 : 0, parseInt(id));
        res.json({ message: 'Announcement updated' });
    } catch (err) {
        console.error('Admin update announcement error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/announcements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prepare('DELETE FROM announcements WHERE id = ?').run(parseInt(id));
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        console.error('Admin delete announcement error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
