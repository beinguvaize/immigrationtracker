const express = require('express');
const { prepare } = require('../db');
const { calculateWaitingTime, calculateWorkPermitCountdown } = require('../services/calculator');

const router = express.Router();

// Get aggregated anonymized statistics
router.get('/', async (req, res) => {
  try {
    const { program_type, stream, noc_code } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (stream) {
      if (stream === 'All AIP') {
        whereClause += ' AND program_type = ?';
        params.push('AIP');
      } else if (stream === 'NS PNP Express Entry') {
        whereClause += ' AND program_type = ? AND stream = ?';
        params.push('NS PNP', 'Express Entry');
      } else if (stream === 'NS PNP Non Express Entry') {
        whereClause += ' AND program_type = ? AND stream != ?';
        params.push('NS PNP', 'Express Entry');
      } else if (stream === 'All NS PNP') {
        whereClause += ' AND program_type = ?';
        params.push('NS PNP');
      } else {
        whereClause += ' AND stream = ?';
        params.push(stream);
      }
    } else if (program_type) {
      whereClause += ' AND program_type = ?';
      params.push(program_type);
    }
    if (noc_code) {
      whereClause += ' AND noc_code = ?';
      params.push(noc_code);
    }

    const statsResult = await prepare(`
      SELECT
        COUNT(*) as total_applicants,
        SUM(CASE WHEN created_at <= datetime('now', '-30 days') THEN 1 ELSE 0 END) as total_prev,
        ROUND(AVG(waiting_months), 1) as avg_waiting_months,
        ROUND(MAX(waiting_months), 1) as max_waiting_months,
        ROUND(MIN(waiting_months), 1) as min_waiting_months,
        ROUND(100.0 * SUM(CASE WHEN status IN ('Nominated', 'Endorsed') THEN 1 ELSE 0 END) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 1) as pct_nominated
      FROM applications ${whereClause}
    `).get(...params);

    // Calculate growth
    const total_now = statsResult.total_applicants || 0;
    const total_prev = statsResult.total_prev || 0;
    let growth_pct = 0;
    if (total_prev > 0) {
      growth_pct = Math.round(((total_now - total_prev) / total_prev) * 100);
    } else if (total_now > 0) {
      growth_pct = 100; // If it went from 0 to N, we'll call it 100% for UI/UX
    }

    const stats = {
      ...statsResult,
      growth_pct,
      growth_trend: growth_pct >= 0 ? 'up' : 'down'
    };

    // Per-program breakdown stats
    const programBreakdown = await prepare(`
      SELECT
        program_type,
        COUNT(*) as total,
        ROUND(AVG(waiting_months), 1) as avg_waiting,
        ROUND(MAX(waiting_months), 1) as max_waiting,
        ROUND(100.0 * SUM(CASE WHEN status IN ('Nominated', 'Endorsed') THEN 1 ELSE 0 END) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 1) as pct_nominated
      FROM applications ${whereClause}
      GROUP BY program_type
    `).all(...params);

    // Status distribution
    const statusDist = await prepare(`
      SELECT status, COUNT(*) as count
      FROM applications ${whereClause}
      GROUP BY status
    `).all(...params);

    // Risk distribution
    const riskDist = await prepare(`
      SELECT risk_level, COUNT(*) as count
      FROM applications ${whereClause}
      GROUP BY risk_level
    `).all(...params);

    // Waiting time distribution (buckets)
    const waitingDist = await prepare(`
      SELECT
        CASE
          WHEN waiting_months < 3 THEN '0-3'
          WHEN waiting_months < 6 THEN '3-6'
          WHEN waiting_months < 9 THEN '6-9'
          WHEN waiting_months < 12 THEN '9-12'
          WHEN waiting_months < 18 THEN '12-18'
          ELSE '18+'
        END as bucket,
        COUNT(*) as count
      FROM applications ${whereClause}
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN '0-3' THEN 1
          WHEN '3-6' THEN 2
          WHEN '6-9' THEN 3
          WHEN '9-12' THEN 4
          WHEN '12-18' THEN 5
          WHEN '18+' THEN 6
        END
    `).all(...params);

    // Available programs/streams
    const programs = await prepare(`
      SELECT DISTINCT program_type, stream, COUNT(*) as count
      FROM applications
      GROUP BY program_type, stream
      ORDER BY program_type, stream
    `).all();

    // Distinct NOC codes for filter
    const nocCodes = await prepare(`
      SELECT DISTINCT noc_code, COUNT(*) as count
      FROM applications
      GROUP BY noc_code
      ORDER BY noc_code
    `).all();

    // Recent Successes (Latest Nominated/Endorsed)
    const recentSuccesses = await prepare(`
      SELECT program_type, noc_code, nominated_date, status
      FROM applications
      WHERE status IN ('Nominated', 'Endorsed')
      ORDER BY nominated_date DESC, submission_date DESC
      LIMIT 10
    `).all();

    res.json({
      stats: stats || { total_applicants: 0, avg_waiting_months: 0, max_waiting_months: 0, min_waiting_months: 0, pct_nominated: 0 },
      programBreakdown,
      statusDistribution: statusDist,
      riskDistribution: riskDist,
      waitingDistribution: waitingDist,
      programs,
      nocCodes,
      recentSuccesses
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get anonymized table data (no user_id, no personal info)
router.get('/table', async (req, res) => {
  try {
    const { program_type, stream, noc_code, status, risk_level, sort, order, page, limit: queryLimit } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (stream) {
      if (stream === 'All AIP') {
        whereClause += ' AND program_type = ?';
        params.push('AIP');
      } else if (stream === 'NS PNP Express Entry') {
        whereClause += ' AND program_type = ? AND stream = ?';
        params.push('NS PNP', 'Express Entry');
      } else if (stream === 'NS PNP Non Express Entry') {
        whereClause += ' AND program_type = ? AND stream != ?';
        params.push('NS PNP', 'Express Entry');
      } else if (stream === 'All NS PNP') {
        whereClause += ' AND program_type = ?';
        params.push('NS PNP');
      } else {
        whereClause += ' AND stream = ?';
        params.push(stream);
      }
    } else if (program_type) {
      whereClause += ' AND program_type = ?';
      params.push(program_type);
    }
    if (noc_code) {
      whereClause += ' AND noc_code = ?';
      params.push(noc_code);
    }
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (risk_level) {
      whereClause += ' AND risk_level = ?';
      params.push(risk_level);
    }
    if (req.query.ns_graduate !== undefined && req.query.ns_graduate !== '') {
      whereClause += ' AND ns_graduate = ?';
      params.push(req.query.ns_graduate === 'true' ? 1 : 0);
    }

    // Sorting
    const allowedSorts = ['waiting_months', 'days_remaining', 'submission_date', 'noc_code', 'status', 'program_type'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'submission_date';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(10, parseInt(queryLimit) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Total count
    const total = await prepare(`SELECT COUNT(*) as c FROM applications ${whereClause}`).get(...params);

    // Fetch anonymized rows — NO user_id, NO id exposed
    const rawRows = await prepare(`
      SELECT
        program_type,
        stream,
        noc_code,
        submission_date,
        work_permit_expiry,
        status,
        nominated_date,
        risk_level,
        status_note,
        ns_graduate,
        has_case_number,
        case_number_date,
        updated_at
      FROM applications
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT ${limitNum} OFFSET ${offset}
    `).all(...params);

    // Compute waiting time and work permit countdown live (never stale)
    const rows = rawRows.map(row => {
      const waiting = calculateWaitingTime(row.submission_date, row.status, row.nominated_date);
      const countdown = calculateWorkPermitCountdown(row.work_permit_expiry);
      return {
        program_type: row.program_type,
        stream: row.stream,
        noc_code: row.noc_code,
        submission_date: row.submission_date,
        status: row.status,
        waiting_months: waiting.totalMonths,
        days_remaining: countdown.daysRemaining,
        risk_level: countdown.riskLevel,
        status_note: row.status_note,
        ns_graduate: row.ns_graduate,
        has_case_number: row.has_case_number,
        case_number_date: row.case_number_date,
        updated_at: row.updated_at
      };
    });

    res.json({
      rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total ? total.c : 0,
        totalPages: total ? Math.ceil(total.c / limitNum) : 0
      }
    });
  } catch (err) {
    console.error('Table error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ACTIVITY FEED =====
router.get('/activity-feed', async (req, res) => {
  try {
    const activity = await prepare(`
      SELECT
        program_type,
        stream,
        noc_code,
        status,
        submission_date,
        nominated_date,
        updated_at
      FROM applications
      ORDER BY updated_at DESC
      LIMIT 15
    `).all();

    const feed = activity.map(row => {
      const waiting = calculateWaitingTime(row.submission_date, row.status, row.nominated_date);
      return {
        ...row,
        waiting_months: waiting.totalMonths
      };
    });

    res.json({ feed });
  } catch (err) {
    console.error('Activity feed error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== NOC SPECIFIC STATS =====
router.get('/noc/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const stats = await prepare(`
      SELECT
        COUNT(*) as total,
        ROUND(AVG(waiting_months), 1) as avg_wait,
        ROUND(MAX(waiting_months), 1) as max_wait,
        ROUND(100.0 * SUM(CASE WHEN status IN ('Nominated', 'Endorsed') THEN 1 ELSE 0 END) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 1) as success_rate
      FROM applications
      WHERE noc_code = ?
    `).get(code);

    res.json({ noc: code, stats: stats || { total: 0, avg_wait: 0, max_wait: 0, success_rate: 0 } });
  } catch (err) {
    console.error('NOC stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== BATCH DETECTOR (INSIGHTS) =====
router.get('/insights', async (req, res) => {
  try {
    // Look for clusters of nominations by submission month
    const batches = await prepare(`
      SELECT
        strftime('%Y-%m', submission_date) as submission_month,
        program_type,
        COUNT(*) as nomination_count
      FROM applications
      WHERE status IN ('Nominated', 'Endorsed')
      AND nominated_date >= datetime('now', '-60 days')
      GROUP BY submission_month, program_type
      HAVING nomination_count >= 3
      ORDER BY submission_month DESC
      LIMIT 5
    `).all();

    res.json({ batches });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PUBLIC ANNOUNCEMENTS =====
router.get('/announcements/active', async (req, res) => {
  try {
    const announcements = await prepare('SELECT message, created_at FROM announcements WHERE active = 1 ORDER BY created_at DESC LIMIT 1').all();
    res.json({ announcement: announcements.length > 0 ? announcements[0] : null });
  } catch (err) {
    console.error('Active announcements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
