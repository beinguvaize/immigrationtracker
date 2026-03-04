/**
 * One-time reseed script: wipes all applications + users (except admin),
 * then inserts 200 fresh, fully-populated applications.
 * 
 * Run: node scripts/reseed.js
 */
require('dotenv').config();
const { initDB, prepare, getDB, saveDB } = require('../db');
const bcrypt = require('bcryptjs');
const { calculateWaitingTime, calculateWorkPermitCountdown } = require('../services/calculator');

// Full NOC lookup table (subset of NOC 2021)
const NOC_LIST = [
    { code: '10010', title: 'Financial managers' },
    { code: '10021', title: 'Banking, credit and other investment managers' },
    { code: '11100', title: 'Financial auditors and accountants' },
    { code: '11200', title: 'Human resources professionals' },
    { code: '12100', title: 'Executive assistants' },
    { code: '12101', title: 'Human resources and recruitment officers' },
    { code: '13100', title: 'Administrative officers' },
    { code: '13110', title: 'Administrative assistants' },
    { code: '14100', title: 'General office support workers' },
    { code: '20010', title: 'Engineering managers' },
    { code: '20012', title: 'Computer and information systems managers' },
    { code: '21102', title: 'Geoscientists and oceanographers' },
    { code: '21211', title: 'Data scientists' },
    { code: '21220', title: 'Cybersecurity specialists' },
    { code: '21221', title: 'Business systems specialists' },
    { code: '21222', title: 'Information systems specialists' },
    { code: '21223', title: 'Database analysts and data administrators' },
    { code: '21231', title: 'Software engineers and designers' },
    { code: '21232', title: 'Software developers and programmers' },
    { code: '21233', title: 'Web designers' },
    { code: '21234', title: 'Web developers and programmers' },
    { code: '21300', title: 'Civil engineers' },
    { code: '21301', title: 'Mechanical engineers' },
    { code: '21310', title: 'Electrical and electronics engineers' },
    { code: '21311', title: 'Computer engineers' },
    { code: '22220', title: 'Computer network and web technicians' },
    { code: '22221', title: 'User support technicians' },
    { code: '30010', title: 'Managers in health care' },
    { code: '31100', title: 'Specialists in clinical and laboratory medicine' },
    { code: '31102', title: 'General practitioners and family physicians' },
    { code: '31110', title: 'Dentists' },
    { code: '31120', title: 'Pharmacists' },
    { code: '31200', title: 'Psychologists' },
    { code: '31202', title: 'Physiotherapists' },
    { code: '31301', title: 'Registered nurses and registered psychiatric nurses' },
    { code: '31302', title: 'Nurse practitioners' },
    { code: '32101', title: 'Licensed practical nurses' },
    { code: '32102', title: 'Paramedical occupations' },
    { code: '40010', title: 'Government managers - health and social policy' },
    { code: '41100', title: 'Judges' },
    { code: '41101', title: 'Lawyers and Quebec notaries' },
    { code: '41200', title: 'University professors and lecturers' },
    { code: '41300', title: 'Social workers' },
    { code: '42100', title: 'Police officers (except commissioned)' },
    { code: '42201', title: 'Social and community service workers' },
    { code: '42202', title: 'Early childhood educators and assistants' },
    { code: '60020', title: 'Retail and wholesale trade managers' },
    { code: '60030', title: 'Restaurant and food service managers' },
    { code: '62020', title: 'Food service supervisors' },
    { code: '62200', title: 'Chefs' },
    { code: '63200', title: 'Cooks' },
    { code: '63210', title: 'Hairstylists and barbers' },
    { code: '64314', title: 'Hotel front desk clerks' },
    { code: '70010', title: 'Construction managers' },
    { code: '72014', title: 'Contractors and supervisors, construction trades' },
    { code: '72200', title: 'Electricians' },
    { code: '72300', title: 'Plumbers' },
    { code: '72310', title: 'Carpenters' },
    { code: '72400', title: 'Construction millwrights and industrial mechanics' },
    { code: '72401', title: 'Heavy-duty equipment mechanics' },
    { code: '72402', title: 'Heating, refrigeration and air conditioning mechanics' },
    { code: '73300', title: 'Transport truck drivers' },
    { code: '80020', title: 'Managers in agriculture' },
    { code: '82030', title: 'Agricultural service contractors and farm supervisors' },
    { code: '90010', title: 'Manufacturing managers' },
];

// TEER = second digit of NOC code
function getTeer(code) {
    return parseInt(String(code)[1], 10);
}

const PROGRAMS = ['NS PNP', 'AIP'];
const STREAMS = {
    'NS PNP': ['Skilled Worker', 'International Graduate', 'In-Demand Healthcare', 'Physician'],
    'AIP': ['High-Skilled', 'Intermediate-Skilled', 'International Graduate']
};
const STATUSES_WEIGHTED = [
    'Submitted', 'Submitted', 'Submitted',   // 30% Submitted
    'Pending', 'Pending', 'Pending',          // 30% Pending
    'Nominated', 'Nominated',                 // 20% Nominated
    'Endorsed',                               // 10% Endorsed
    'Refused'                                 // 10% Refused
];

function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateOffset(baseDate, minDays, maxDays) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + minDays + Math.floor(Math.random() * (maxDays - minDays)));
    return d.toISOString().split('T')[0];
}

async function reseed() {
    console.log('[Reseed] Initialising DB connection...');
    await initDB();
    const db = getDB();

    // ── STEP 1: Wipe everything ────────────────────────────────────────────
    console.log('[Reseed] Wiping existing data...');
    await db.batch([
        { sql: 'DELETE FROM applications', args: [] },
        { sql: "DELETE FROM users WHERE role != 'admin'", args: [] }
    ], 'write');
    console.log('[Reseed] Wiped applications and non-admin users.');

    // ── STEP 2: Recreate admin ─────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin123', 10);
    await prepare('INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?,?,?)').run('admin@example.com', adminHash, 'admin');

    // ── STEP 3: Create 50 sample users ────────────────────────────────────
    const userHash = await bcrypt.hash('password123', 10);
    for (let i = 1; i <= 50; i++) {
        await prepare('INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?,?,?)').run(`user${i}@example.com`, userHash, 'user');
    }
    const userRows = await prepare("SELECT id FROM users WHERE role = 'user'").all();
    const userIds = userRows.map(u => u.id);
    console.log(`[Reseed] Created ${userIds.length} sample users.`);

    // ── STEP 4: Build 200 applications ────────────────────────────────────
    const now = new Date('2026-03-04');
    const statements = [];

    for (let i = 0; i < 200; i++) {
        const userId = rand(userIds);
        const programType = rand(PROGRAMS);
        const stream = rand(STREAMS[programType]);
        const status = rand(STATUSES_WEIGHTED);
        const noc = rand(NOC_LIST);
        const teer = getTeer(noc.code);
        const isNsGrad = Math.random() > 0.7;  // 30% are NS graduates
        const hasCaseNum = Math.random() > 0.6; // 40% have case number

        // Submission date: 1–30 months ago
        const subMonthsAgo = 1 + Math.floor(Math.random() * 29);
        const subDate = new Date(now);
        subDate.setMonth(subDate.getMonth() - subMonthsAgo);
        const submissionDate = subDate.toISOString().split('T')[0];

        // Work permit expiry: 6 months before to 18 months after now
        const wpOffset = -180 + Math.floor(Math.random() * 720);
        const wpDate = new Date(now);
        wpDate.setDate(wpDate.getDate() + wpOffset);
        const workPermitExpiry = wpDate.toISOString().split('T')[0];

        // Nominated date: 1–6 months after submission (only if nominated/endorsed/refused)
        let nominatedDate = null;
        if (['Nominated', 'Endorsed', 'Refused'].includes(status)) {
            nominatedDate = randomDateOffset(submissionDate, 30, Math.min(subMonthsAgo * 30 - 5, 180));
        }

        // Case number date: after submission
        const caseNumberDate = hasCaseNum ? randomDateOffset(submissionDate, 10, 90) : null;

        const statusNote = rand([
            'Waiting for ADR response',
            'Documents submitted, awaiting review',
            'Medical done, waiting for nomination',
            'Background check in progress',
            'Everything submitted, just waiting',
            'File created, no updates yet',
            null, null, null, null // 40% no note
        ]);

        const waiting = calculateWaitingTime(submissionDate, status, nominatedDate);
        const countdown = calculateWorkPermitCountdown(workPermitExpiry);

        statements.push({
            sql: `INSERT INTO applications (
                user_id, program_type, stream, noc_code, submission_date,
                work_permit_expiry, status, nominated_date, waiting_months,
                days_remaining, risk_level, status_note, ns_graduate,
                has_case_number, case_number_date
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            args: [
                userId, programType, stream, noc.code, submissionDate,
                workPermitExpiry, status, nominatedDate, waiting.totalMonths,
                countdown.daysRemaining, countdown.riskLevel,
                statusNote, isNsGrad ? 1 : 0,
                hasCaseNum ? 1 : 0, caseNumberDate
            ]
        });
    }

    // Batch-insert in chunks of 50
    for (let i = 0; i < statements.length; i += 50) {
        const chunk = statements.slice(i, i + 50);
        await db.batch(chunk, 'write');
        console.log(`[Reseed] Inserted batch ${Math.floor(i / 50) + 1} (${chunk.length} apps)...`);
    }

    console.log('[Reseed] ✅ Done! 200 applications seeded successfully.');
    process.exit(0);
}

reseed().catch(err => {
    console.error('[Reseed] ERROR:', err);
    process.exit(1);
});
