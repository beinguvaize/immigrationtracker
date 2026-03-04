const express = require('express');
const { prepare } = require('../db');

const router = express.Router();

// Get aggregated anonymized statistics
router.get('/', async (req, res) => {
  try {
    const { program_type, stream, noc_code } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (program_type) {
      whereClause += ' AND program_type = ?';
      params.push(program_type);
    }
    if (stream) {
      whereClause += ' AND stream = ?';
      params.push(stream);
    }
    if (noc_code) {
      whereClause += ' AND noc_code = ?';
      params.push(noc_code);
    }

    // Aggregate statistics
    const stats = await prepare(`
      SELECT
        COUNT(*) as total_applicants,
        ROUND(AVG(waiting_months), 1) as avg_waiting_months,
        ROUND(MAX(waiting_months), 1) as max_waiting_months,
        ROUND(MIN(waiting_months), 1) as min_waiting_months,
        ROUND(100.0 * SUM(CASE WHEN status IN ('Nominated', 'Endorsed') THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) as pct_nominated
      FROM applications ${whereClause}
    `).get(...params);

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

    res.json({
      stats: stats || { total_applicants: 0, avg_waiting_months: 0, max_waiting_months: 0, min_waiting_months: 0, pct_nominated: 0 },
      statusDistribution: statusDist,
      riskDistribution: riskDist,
      waitingDistribution: waitingDist,
      programs,
      nocCodes
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

    if (program_type) {
      whereClause += ' AND program_type = ?';
      params.push(program_type);
    }
    if (stream) {
      whereClause += ' AND stream = ?';
      params.push(stream);
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
    const rows = await prepare(`
      SELECT
        program_type,
        stream,
        noc_code,
        submission_date,
        status,
        waiting_months,
        days_remaining,
        risk_level,
        status_note,
        ns_graduate,
        has_case_number,
        case_number_date
      FROM applications
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT ${limitNum} OFFSET ${offset}
    `).all(...params);

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
