const express = require('express');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const { initDB } = require('./db');

async function startServer() {
    await initDB();

    const { seedDatabase } = require('./services/seeder');
    const { startAutomation } = require('./services/automation');
    const authRoutes = require('./routes/auth');
    const applicationRoutes = require('./routes/applications');
    const statsRoutes = require('./routes/stats');
    const adminRoutes = require('./routes/admin');

    const app = express();
    const PORT = process.env.PORT || 3000;

    // Middleware
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/applications', applicationRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/admin', adminRoutes);

    // SPA fallback — serve admin.html for /admin path
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    });

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Initialize
    startAutomation();

    app.listen(PORT, () => {
        console.log(`\n🍁 IRCC Tracker running at http://localhost:${PORT}`);
        console.log(`   Admin panel at http://localhost:${PORT}/admin\n`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
