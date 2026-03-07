const { initDB, prepare } = require('./db');

async function run() {
    await initDB();
    const query = "SELECT COUNT(*) as count FROM applications WHERE 1=1 AND program_type = ? AND program_type = ?";
    const params = ['NS PNP', 'NS PNP'];
    const rows = await prepare(query).all(...params);
    console.log("Query:", query);
    console.log("Params:", params);
    console.log("Result:", JSON.stringify(rows, null, 2));
    process.exit(0);
}

run().catch(console.error);
