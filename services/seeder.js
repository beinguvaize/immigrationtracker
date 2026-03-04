const { prepare, saveDB } = require('../db');
const bcrypt = require('bcryptjs');

const PROGRAMS = ['NS PNP', 'AIP'];
const STREAMS = {
    'NS PNP': ['Skilled Worker', 'International Graduate', 'In-Demand Healthcare', 'Physician'],
    'AIP': ['High-Skilled', 'Intermediate-Skilled', 'International Graduate']
};
const STATUSES = ['Submitted', 'Pending', 'Nominated', 'Endorsed', 'Refused'];

async function seedDatabase() {
    try {
        const appCount = await prepare('SELECT COUNT(*) as c FROM applications').get();
        const currentCount = appCount ? Number(appCount.c) : 0;

        console.log('[Seeder] Seeding database with anonymized applications...');

        // 1. Create one admin user (ignore if exists)
        const adminPasswordHash = await bcrypt.hash('admin123', 12);
        await prepare('INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)').run('admin@example.com', adminPasswordHash, 'admin');

        // 2. Create sample users for the aggregate stats (ignore if exists)
        const samplePasswordHash = await bcrypt.hash('password123', 12);
        for (let i = 1; i <= 50; i++) {
            await prepare('INSERT OR IGNORE INTO users (email, password_hash) VALUES (?, ?)').run(`user${i}@example.com`, samplePasswordHash);
        }

        // Fetch user IDs to use for application seeding
        const users = await prepare('SELECT id FROM users WHERE role = ?').all('user');
        const sampleUsers = users.map(u => u.id);

        const { calculateWaitingTime, calculateWorkPermitCountdown } = require('./calculator');

        if (sampleUsers.length === 0) {
            console.error('[Seeder] Error: No sample users created.');
            return;
        }

        // 3. Create ~200 anonymized applications
        const appsToCreate = 200 - currentCount;
        if (appsToCreate <= 0) return;

        const statements = [];
        for (let i = 0; i < appsToCreate; i++) {
            const userId = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
            const programType = PROGRAMS[Math.floor(Math.random() * PROGRAMS.length)];
            const stream = STREAMS[programType][Math.floor(Math.random() * STREAMS[programType].length)];
            const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];

            // Noc codes for variety
            const nocCodes = ['21222', '21223', '31301', '62020', '72014', '21232'];
            const nocCode = nocCodes[Math.floor(Math.random() * nocCodes.length)];

            // Random submission date in the last 2 years
            const subDate = new Date();
            subDate.setMonth(subDate.getMonth() - Math.floor(Math.random() * 24));
            const submissionDate = subDate.toISOString().split('T')[0];

            // Random expiry in the future or past
            const expDate = new Date();
            expDate.setMonth(expDate.getMonth() + (Math.floor(Math.random() * 24) - 6));
            const workPermitExpiry = expDate.toISOString().split('T')[0];

            // Calculation
            const waiting = calculateWaitingTime(submissionDate, status, null);
            const permit = calculateWorkPermitCountdown(workPermitExpiry);

            statements.push({
                sql: `
                    INSERT INTO applications (
                        user_id, program_type, stream, noc_code, submission_date, 
                        work_permit_expiry, status, waiting_months, days_remaining, risk_level
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    userId, programType, stream, nocCode, submissionDate,
                    workPermitExpiry, status, waiting.totalMonths, permit.daysRemaining, permit.riskLevel
                ]
            });
        }

        console.log(`[Seeder] Built ${statements.length} statements for ${sampleUsers.length} users.`);
        const { getDB } = require('../db');
        const dbClient = getDB();

        // Batch in chunks of 50 to respect rate limits
        const chunkSize = 50;
        for (let i = 0; i < statements.length; i += chunkSize) {
            const chunk = statements.slice(i, i + chunkSize);
            try {
                await dbClient.batch(chunk, 'write');
                console.log(`[Seeder] Inserted batch of ${chunk.length} applications...`);
            } catch (err) {
                console.error(`[Seeder] Batch insert error: ${err.message}`);
                throw err;
            }
        }

        saveDB();
        console.log('[Seeder] Seeded 51 users and 200 applications');
    } catch (err) {
        console.error('[Seeder] Error seeding database:', err);
    }
}

module.exports = { seedDatabase };
