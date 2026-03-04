const { initDB, prepare } = require('./db');

async function debug() {
    await initDB();
    console.log('--- Searching Applications ---');
    const apps = await prepare('SELECT * FROM applications').all();
    const hits = apps.filter(app => {
        return JSON.stringify(app).includes('4240');
    });
    console.log('Matching Application Rows:', hits);

    console.log('--- Searching Users ---');
    const users = await prepare('SELECT * FROM users').all();
    const userHits = users.filter(user => {
        return JSON.stringify(user).includes('4240');
    });
    console.log('Matching User Rows:', userHits);

    if (hits.length === 0 && userHits.length === 0) {
        console.log('No matches found for 4240 in any field of applications or users.');
    }

    process.exit(0);
}

debug();
