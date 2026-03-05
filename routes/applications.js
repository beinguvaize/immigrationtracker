const express = require('express');
const { prepare, saveDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { calculateWaitingTime, calculateWorkPermitCountdown } = require('../services/calculator');

const router = express.Router();

// Get all applications for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const apps = await prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);

        const enriched = apps.map(app => {
            const waiting = calculateWaitingTime(app.submission_date, app.status, app.nominated_date);
            const countdown = calculateWorkPermitCountdown(app.work_permit_expiry);
            return { ...app, ...waiting, ...countdown };
        });

        res.json(enriched);
    } catch (err) {
        console.error('Get applications error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new application
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { program_type, stream, noc_code, submission_date, work_permit_expiry, status, status_note, ns_graduate, has_case_number, case_number_date, nominated_date } = req.body;

        if (!program_type || !stream || !noc_code || !submission_date || !work_permit_expiry) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        let nominatedDate = null;
        if (status === 'Nominated' || status === 'Endorsed') {
            nominatedDate = nominated_date || new Date().toISOString().split('T')[0];
        }

        const waiting = calculateWaitingTime(submission_date, status || 'Submitted', nominatedDate);
        const countdown = calculateWorkPermitCountdown(work_permit_expiry);

        const result = await prepare(`
      INSERT INTO applications (user_id, program_type, stream, noc_code, submission_date, work_permit_expiry, status, nominated_date, waiting_months, days_remaining, risk_level, status_note, ns_graduate, has_case_number, case_number_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            req.user.id,
            program_type,
            stream,
            noc_code,
            submission_date,
            work_permit_expiry,
            status || 'Submitted',
            nominatedDate,
            waiting.totalMonths,
            countdown.daysRemaining,
            countdown.riskLevel,
            status_note || '',
            ns_graduate ? 1 : 0,
            has_case_number ? 1 : 0,
            has_case_number && case_number_date ? case_number_date : null
        );

        saveDB();
        const newApp = await prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newApp);
    } catch (err) {
        console.error('Create application error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update an application
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const app = await prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?').get(parseInt(id), req.user.id);

        if (!app) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const { program_type, stream, noc_code, submission_date, work_permit_expiry, status, status_note, ns_graduate, has_case_number, case_number_date, nominated_date } = req.body;

        let nominatedDate = app.nominated_date;
        if ((status === 'Nominated' || status === 'Endorsed') && app.status !== 'Nominated' && app.status !== 'Endorsed') {
            nominatedDate = nominated_date || new Date().toISOString().split('T')[0];
        } else if (status === 'Nominated' || status === 'Endorsed') {
            // Allow updating the nominated_date if user provides one
            nominatedDate = nominated_date || app.nominated_date;
        }

        const waiting = calculateWaitingTime(
            submission_date || app.submission_date,
            status || app.status,
            nominatedDate
        );
        const countdown = calculateWorkPermitCountdown(work_permit_expiry || app.work_permit_expiry);

        await prepare(`
      UPDATE applications
      SET program_type = ?, stream = ?, noc_code = ?, submission_date = ?, work_permit_expiry = ?,
          status = ?, nominated_date = ?, waiting_months = ?, days_remaining = ?, risk_level = ?, 
          status_note = ?, ns_graduate = ?, has_case_number = ?, case_number_date = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
            program_type || app.program_type,
            stream || app.stream,
            noc_code || app.noc_code,
            submission_date || app.submission_date,
            work_permit_expiry || app.work_permit_expiry,
            status || app.status,
            nominatedDate,
            waiting.totalMonths,
            countdown.daysRemaining,
            countdown.riskLevel,
            status_note !== undefined ? status_note : app.status_note,
            ns_graduate !== undefined ? (ns_graduate ? 1 : 0) : app.ns_graduate,
            has_case_number !== undefined ? (has_case_number ? 1 : 0) : app.has_case_number,
            has_case_number && case_number_date ? case_number_date : (has_case_number === false ? null : app.case_number_date),
            parseInt(id),
            req.user.id
        );

        saveDB();
        const updated = await prepare('SELECT * FROM applications WHERE id = ?').get(parseInt(id));
        res.json(updated);
    } catch (err) {
        console.error('Update application error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete an application
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DELETE APP] User ${req.user.id} attempting to delete app ${id}`);
        const result = await prepare('DELETE FROM applications WHERE id = ? AND user_id = ?').run(parseInt(id), req.user.id);
        console.log(`[DELETE APP] Result:`, result);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        saveDB();
        res.json({ message: 'Application deleted' });
    } catch (err) {
        console.error('Delete application error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
