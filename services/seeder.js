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
        console.log('[Seeder] Ensuring essential system data...');

        // 1. Create one admin user (ignore if exists)
        const adminPasswordHash = await bcrypt.hash('admin123', 12);
        await prepare('INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)').run('admin@example.com', adminPasswordHash, 'admin');

        console.log('[Seeder] Production-safe: Mock data generation disabled.');
    } catch (err) {
        console.error('[Seeder] Error seeding database:', err);
    }
}

module.exports = { seedDatabase };
