const { prepare, saveDB } = require('../db');
const { calculateWaitingTime, calculateWorkPermitCountdown } = require('./calculator');

/**
 * Recalculate all computed fields for every active application.
 * Safe to call in both traditional Node server and serverless environments.
 */
async function recalculateAll() {
    try {
        const apps = await prepare('SELECT id, submission_date, work_permit_expiry, status, nominated_date FROM applications').all();
        const rows = Array.isArray(apps) ? apps : [];

        for (const app of rows) {
            const waiting = calculateWaitingTime(app.submission_date, app.status, app.nominated_date);
            const countdown = calculateWorkPermitCountdown(app.work_permit_expiry);

            await prepare(`
                UPDATE applications
                SET waiting_months = ?, days_remaining = ?, risk_level = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(
                waiting.totalMonths,
                countdown.daysRemaining,
                countdown.riskLevel,
                app.id
            );
        }

        saveDB();
        console.log(`[Automation] Recalculated ${rows.length} applications at ${new Date().toISOString()}`);
    } catch (err) {
        console.error('[Automation] Recalculate error:', err);
    }
}

/**
 * Start automation — only uses setInterval in a traditional server environment.
 * In serverless (Vercel), recalculateAll is called on boot via the seeder.
 */
function startAutomation() {
    recalculateAll(); // initial run

    // Only schedule interval if we're in a long-running process (not serverless)
    if (process.env.VERCEL !== '1') {
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        setInterval(recalculateAll, TWENTY_FOUR_HOURS);
        console.log('[Automation] Scheduled daily recalculation');
    } else {
        console.log('[Automation] Serverless mode: skipping interval scheduling');
    }
}

module.exports = { recalculateAll, startAutomation };
