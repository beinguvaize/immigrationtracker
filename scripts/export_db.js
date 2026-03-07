const { initDB, getDB } = require('../db');
const fs = require('fs');
const path = require('path');

async function exportData() {
    try {
        console.log('[Backup] Initializing DB connection...');
        await initDB();
        const client = getDB();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

        const tables = ['users', 'applications', 'announcements'];
        const backupPath = path.join(backupDir, `db_export_${timestamp}.json`);

        const backupContent = {
            timestamp: new Date().toISOString(),
            data: {}
        };

        for (const table of tables) {
            console.log(`[Backup] Exporting table: ${table}...`);
            try {
                const result = await client.execute(`SELECT * FROM ${table}`);
                backupContent.data[table] = result.rows;
                console.log(`[Backup] Exported ${result.rows.length} rows from ${table}.`);
            } catch (tableErr) {
                console.warn(`[Backup] Could not export table ${table}:`, tableErr.message);
            }
        }

        fs.writeFileSync(backupPath, JSON.stringify(backupContent, null, 2));
        console.log(`[Backup] Database export saved to: ${backupPath}`);

        process.exit(0);
    } catch (err) {
        console.error('[Backup] Fatal Export Error:', err);
        process.exit(1);
    }
}

exportData();
