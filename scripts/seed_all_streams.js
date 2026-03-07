const { initDB, prepare } = require('../db');
const fs = require('fs');
const path = require('path');

const STREAMS = {
    'NS PNP': [
        'Skilled Worker',
        'Express Entry',
        'International Graduate in Demand',
        'Physician',
        'Entrepreneur',
        'International Graduate Entrepreneur',
        'Labour Market Priorities',
        'Occupations in Demand'
    ],
    'AIP': [
        'Atlantic International Graduate Program',
        'Atlantic High-Skilled Program',
        'Atlantic Intermediate-Skilled Program'
    ]
};

const STATUSES = ['Submitted', 'Selected for EOI', 'Nominated', 'Refused'];
const NOC_CODES = ['1121', '2174', '3012', '4011', '6211', '7231'];

async function seed() {
    try {
        console.log('[SEED] Initializing database...');
        await initDB();

        // Get the first user to assign applications to
        const user = await prepare('SELECT id FROM users LIMIT 1').get();
        if (!user) {
            console.error('[SEED] No users found. Please register a user first.');
            process.exit(1);
        }
        const userId = user.id;

        console.log(`[SEED] Seeding applications for user ID: ${userId}`);

        const insertStmt = prepare(`
            INSERT INTO applications (
                user_id, program_type, stream, noc_code, submission_date, 
                work_permit_expiry, status, nominated_date, status_note, ns_graduate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let total = 0;
        for (const [program, streams] of Object.entries(STREAMS)) {
            for (const stream of streams) {
                console.log(`[SEED] Adding 10 applications for ${program} - ${stream}...`);
                for (let i = 0; i < 10; i++) {
                    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
                    const noc = NOC_CODES[Math.floor(Math.random() * NOC_CODES.length)];

                    // Random dates within last year
                    const subDate = new Date();
                    subDate.setMonth(subDate.getMonth() - Math.floor(Math.random() * 12));
                    const submission_date = subDate.toISOString().split('T')[0];

                    // Expiry in 6-18 months
                    const expDate = new Date();
                    expDate.setMonth(expDate.getMonth() + 6 + Math.floor(Math.random() * 12));
                    const work_permit_expiry = expDate.toISOString().split('T')[0];

                    const nominated_date = (status === 'Nominated' || status === 'Endorsed')
                        ? new Date(subDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        : null;

                    const ns_graduate = Math.random() > 0.7 ? 1 : 0;
                    const status_note = `This is a mock application for ${stream} testing.`;

                    await insertStmt.run(
                        userId, program, stream, noc, submission_date,
                        work_permit_expiry, status, nominated_date, status_note, ns_graduate
                    );
                    total++;
                }
            }
        }

        console.log(`[SEED] COMPLETED. Total records added: ${total}`);
        process.exit(0);
    } catch (err) {
        console.error('[SEED] Error:', err);
        process.exit(1);
    }
}

seed();
