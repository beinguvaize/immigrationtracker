const { prepare, saveDB } = require('../db');
const { calculateWaitingTime, calculateWorkPermitCountdown } = require('./calculator');

/**
 * Recalculate all computed fields for every active application.
 */
async function recalculateAll() {
    try {
        const apps = await prepare('SELECT id, submission_date, work_permit_expiry, status, nominated_date FROM applications').all();

        if (apps) {
            for (const app of apps) {
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
        }

        saveDB();
        console.log(`[Automation] Recalculated ${apps?.length || 0} applications at ${new Date().toISOString()}`);
    } catch (err) {
        console.error('[Automation] Recalculate error:', err);
    }
}

function startAutomation() {
    recalculateAll(); // initial run
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(recalculateAll, TWENTY_FOUR_HOURS);
    console.log('[Automation] Scheduled daily recalculation');
}

module.exports = { recalculateAll, startAutomation };
