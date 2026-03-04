const { initDB, prepare } = require('./db');

async function debug() {
    await initDB();
    console.log('Searching for ID 4240 in users...');
    const userById = await prepare('SELECT * FROM users WHERE id = ?').get(4240);
    console.log('User by ID 4240:', userById);

    console.log('Searching for 4240 in NOC code...');
    const appsByNoc = await prepare('SELECT * FROM applications WHERE noc_code LIKE ?').all('%4240%');
    console.log('Apps with NOC matching 4240:', appsByNoc);

    console.log('Searching for 4240 in any status note...');
    const appsByNote = await prepare('SELECT * FROM applications WHERE status_note LIKE ?').all('%4240%');
    console.log('Apps with Note matching 4240:', appsByNote);

    console.log('Getting all users to check range...');
    const allUsers = await prepare('SELECT id, email FROM users ORDER BY id DESC LIMIT 20').all();
    console.log('Recent Users:', allUsers);

    console.log('Getting all applications to check range...');
    const allApps = await prepare('SELECT id, user_id, noc_code FROM applications ORDER BY id DESC LIMIT 20').all();
    console.log('Recent Applications:', allApps);

    process.exit(0);
}

debug();
