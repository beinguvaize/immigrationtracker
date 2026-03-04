// ===== ADMIN STATE =====
const adminState = {
    user: null,
    stats: null,
    users: [],
    apps: [],
    currentPanel: 'overview',
    appsPage: 1
};

// Global for pagination access
window.handleAdminPageChange = (page) => {
    adminState.appsPage = page;
    loadAdminApps();
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    adminState.user = api.getUser();

    if (!adminState.user || adminState.user.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    const emailEl = document.getElementById('adminEmail');
    const emailSpan = document.getElementById('adminEmailSpan');
    if (emailEl) emailEl.innerText = adminState.user.email;
    if (emailSpan) emailSpan.innerText = adminState.user.email;

    initAdminNav();
    loadDashboard();

    document.getElementById('logoutBtn').addEventListener('click', () => {
        api.logout();
        window.location.href = '/';
    });
});

function initAdminNav() {
    const navItems = document.querySelectorAll('.side-nav__link');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const panel = item.dataset.panel;
            if (!panel) return;

            e.preventDefault();

            // UI Update
            navItems.forEach(i => i.classList.remove('side-nav__link--active'));
            item.classList.add('side-nav__link--active');

            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('admin-panel--active'));
            const panelEl = document.getElementById(`panel${panel.charAt(0).toUpperCase() + panel.slice(1)}`);
            if (panelEl) panelEl.classList.add('admin-panel--active');

            adminState.currentPanel = panel;
            loadPanelData(panel);
        });
    });
}

async function loadPanelData(panel) {
    if (panel === 'overview') loadDashboard();
    if (panel === 'users') loadUsers();
    if (panel === 'apps') {
        adminState.appsPage = 1;
        loadAdminApps();
    }
    if (panel === 'announcements') loadAnnouncements();
}

// ===== DASHBOARD OVERVIEW =====
async function loadDashboard() {
    try {
        const data = await api.getAdminDashboard();
        adminState.stats = data;

        document.getElementById('adminStatsGrid').innerHTML = ui.renderAdminStats(data);
        renderRecentUsers(data.recentUsers);
        renderProgramChart(data.programDistribution);
    } catch (err) {
        ui.showToast('Failed to load admin dashboard', 'error');
    }
}

function renderRecentUsers(users) {
    const list = document.getElementById('recentUsersList');
    list.innerHTML = users.map(u => `
        <tr>
            <td>${u.email}</td>
            <td><span class="role-badge role-badge--${u.role}">${u.role}</span></td>
            <td>${ui.formatDate(u.created_at)}</td>
        </tr>
    `).join('');
}

let programChart = null;
function renderProgramChart(dist) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, skipping chart render.');
        return;
    }

    const canvas = document.getElementById('adminProgramChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (programChart) programChart.destroy();

    programChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dist.map(d => d.program_type),
            datasets: [{
                data: dist.map(d => d.count),
                backgroundColor: ['#14532d', '#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit' } } }
            },
            cutout: '70%'
        }
    });
}

// ===== USER MANAGER =====
async function loadUsers() {
    try {
        const search = document.getElementById('userSearch').value;
        const role = document.getElementById('userFilterRole').value;
        const data = await api.getAdminUsers({ search, role });

        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = data.users.map(u => `
            <tr>
                <td style="font-weight: 600;">${u.email}</td>
                <td>
                    <select class="form-select btn--sm" style="padding: 2px 8px; font-size: 11px;" onchange="admin.updateUserRole(${u.id}, this.value)">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td style="text-align: center;">${u.app_count}</td>
                <td>${ui.formatDate(u.created_at)}</td>
                <td>
                    <button class="btn btn--danger btn--sm" onclick="admin.deleteUser(${u.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        ui.showToast('Failed to load users', 'error');
    }
}

// ===== ALL APPLICATIONS =====
async function loadAdminApps() {
    try {
        const program = document.getElementById('appFilterProgram').value;
        const status = document.getElementById('appFilterStatus').value;
        const search = document.getElementById('appSearch').value;

        const data = await api.getAdminApplications({
            program_type: program,
            status,
            search,
            page: adminState.appsPage,
            limit: 15
        });

        adminState.apps = data.applications;

        const tbody = document.getElementById('adminAppTableBody');
        tbody.innerHTML = data.applications.map(a => `
            <tr>
                <td style="text-align: center;"><input type="checkbox" class="app-checkbox" value="${a.id}" style="cursor: pointer;"></td>
                <td style="font-size: 12px; font-weight: 500;">${a.user_email}</td>
                <td style="font-size: 11px;">${a.program_type}</td>
                <td class="cell-mono">${a.noc_code}</td>
                <td><span class="status-pill status-pill--${a.status.toLowerCase()}">${a.status}</span></td>
                <td class="cell-mono">${a.waiting_months}m</td>
                <td style="display: flex; gap: 4px;">
                    <button class="btn btn--secondary btn--sm" style="padding: 4px 8px; font-size: 10px;" onclick="admin.viewDetails(${a.id})">Details</button>
                    <button class="btn btn--secondary btn--sm" style="padding: 4px 8px; font-size: 10px;" onclick="admin.editApp(${a.id})">Edit</button>
                    <button class="btn btn--danger btn--sm" style="padding: 4px 8px; font-size: 10px;" onclick="admin.deleteApp(${a.id})">Delete</button>
                </td>
            </tr>
        `).join('');

        // Render Pagination
        document.getElementById('adminAppPagination').innerHTML = ui.renderPagination(data.pagination, 'handleAdminPageChange');

    } catch (err) {
        ui.showToast('Failed to load global applications', 'error');
    }
}

// ===== ANNOUNCEMENTS =====
async function loadAnnouncements() {
    try {
        const data = await api.getAdminAnnouncements();
        const tbody = document.getElementById('announcementsTableBody');

        if (data.announcements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No announcements created yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.announcements.map(a => `
            <tr>
                <td><strong>${a.message}</strong></td>
                <td>${ui.formatDate(a.created_at)}</td>
                <td>
                    <span class="status-pill status-pill--${a.active ? 'nominated' : 'refused'}" style="cursor: pointer;" onclick="admin.toggleAnnouncement(${a.id}, ${!a.active})">
                        ${a.active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn--danger btn--sm" onclick="admin.deleteAnnouncement(${a.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        ui.showToast('Failed to load announcements', 'error');
    }
}

document.getElementById('announcementForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newAnnouncementMsg');
    try {
        await api.createAdminAnnouncement(input.value);
        input.value = '';
        ui.showToast('Announcement published', 'success');
        loadAnnouncements();
    } catch (err) {
        ui.showToast(err.message, 'error');
    }
});

// Global 'admin' object for actions
window.admin = {
    async updateUserRole(id, role) {
        try {
            await api.updateAdminUserRole(id, role);
            ui.showToast('User role updated', 'success');
        } catch (err) {
            ui.showToast(err.message, 'error');
        }
    },
    async deleteUser(id) {
        if (!confirm('Delete user and all their applications?')) return;
        try {
            await api.deleteAdminUser(id);
            ui.showToast('User deleted', 'success');
            loadUsers();
        } catch (err) {
            ui.showToast(err.message, 'error');
        }
    },
    async deleteApp(id) {
        if (!confirm('Delete this application record?')) return;
        try {
            await api.deleteAdminApplication(id);
            ui.showToast('Application deleted', 'success');
            loadAdminApps();
        } catch (err) {
            ui.showToast(err.message, 'error');
        }
    },
    viewDetails(id) {
        const appData = adminState.apps.find(a => a.id === id);
        if (!appData) return;

        const content = document.getElementById('adminDetailsContent');
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg);">
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">User Account</div><strong>${appData.user_email}</strong></div>
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Program / Stream</div><strong>${appData.program_type}</strong> <br><span style="font-size:12px; opacity:0.8">${appData.stream}</span></div>
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">NOC Code</div><code class="cell-mono">${appData.noc_code}</code></div>
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Submission Date</div><strong>${ui.formatDate(appData.submission_date)}</strong></div>
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">WP Expiry</div><strong>${ui.formatDate(appData.work_permit_expiry)}</strong><br><span style="font-size:11px; color:var(--accent-info)">${appData.days_remaining} days left</span></div>
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Current Status</div><span class="status-pill status-pill--${appData.status.toLowerCase()}">${appData.status}</span></div>
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">NS Graduate</div><strong>${appData.ns_graduate ? '🎓 Yes' : 'No'}</strong></div>
                <div><div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Case Number</div><strong>${appData.has_case_number ? '✅ ' + ui.formatDate(appData.case_number_date) : '❌ No'}</strong></div>
            </div>
            ${appData.status_note ? `<div style="padding: 1rem; border-left: 4px solid var(--bg-accent); background: var(--bg-accent-light); border-radius: 4px;">
                <div style="font-size: 11px; color: var(--text-accent); text-transform: uppercase; margin-bottom: 4px;">Public Status Note</div>
                <em style="color: var(--text-primary); font-style: normal; font-size: 13px;">"${appData.status_note}"</em>
            </div>` : ''}
        `;
        document.getElementById('adminDetailsModal').classList.remove('hidden');
    },
    editApp(id) {
        const appData = adminState.apps.find(a => a.id === id);
        if (!appData) return;

        document.getElementById('adminEditAppId').value = id;
        document.getElementById('adminProg').value = appData.program_type;
        updateAdminStreamOptions();
        document.getElementById('adminStream').value = appData.stream;
        document.getElementById('adminNoc').value = appData.noc_code;
        document.getElementById('adminSubDate').value = appData.submission_date;
        document.getElementById('adminWpExpiry').value = appData.work_permit_expiry;
        document.getElementById('adminStatus').value = appData.status;
        toggleAdminNominatedDateField(); // Show/hide nominated date container
        document.getElementById('adminNominatedDate').value = appData.nominated_date || '';
        document.getElementById('adminStatusNote').value = appData.status_note || '';
        document.getElementById('adminNsGrad').checked = !!appData.ns_graduate;

        const hasCase = document.getElementById('adminHasCase');
        hasCase.checked = !!appData.has_case_number;
        document.getElementById('adminCaseDate').value = appData.case_number_date || '';
        document.getElementById('adminCaseDateContainer').classList.toggle('hidden', !hasCase.checked);

        document.getElementById('adminEditModal').classList.remove('hidden');
    },
    async toggleAnnouncement(id, active) {
        try {
            await api.toggleAdminAnnouncement(id, active);
            loadAnnouncements();
        } catch (err) {
            ui.showToast(err.message, 'error');
        }
    },
    async deleteAnnouncement(id) {
        if (!confirm('Delete this announcement permanently?')) return;
        try {
            await api.deleteAdminAnnouncement(id);
            ui.showToast('Announcement deleted', 'success');
            loadAnnouncements();
        } catch (err) {
            ui.showToast(err.message, 'error');
        }
    }
};

// Filters listeners
['userSearch', 'userFilterRole'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => loadUsers());
});
['appSearch', 'appFilterProgram', 'appFilterStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
        adminState.appsPage = 1;
        loadAdminApps();
    });
});

function updateAdminStreamOptions() {
    const program = document.getElementById('adminProg').value;
    const streamSelect = document.getElementById('adminStream');
    let options = '';
    if (program && STREAMS[program]) {
        options += STREAMS[program].map(s => `<option value="${s}">${s}</option>`).join('');
    }
    streamSelect.innerHTML = options;
}

function toggleAdminNominatedDateField() {
    const status = document.getElementById('adminStatus').value;
    const container = document.getElementById('adminNominatedDateContainer');
    if (status === 'Nominated' || status === 'Endorsed') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
        document.getElementById('adminNominatedDate').value = '';
    }
}

document.getElementById('adminStatus')?.addEventListener('change', toggleAdminNominatedDateField);
document.getElementById('adminProg')?.addEventListener('change', updateAdminStreamOptions);

document.getElementById('adminHasCase')?.addEventListener('change', (e) => {
    document.getElementById('adminCaseDateContainer').classList.toggle('hidden', !e.target.checked);
    if (!e.target.checked) document.getElementById('adminCaseDate').value = '';
});

document.getElementById('adminEditCloseBtn')?.addEventListener('click', () => document.getElementById('adminEditModal').classList.add('hidden'));
document.getElementById('adminEditCancelBtn')?.addEventListener('click', () => document.getElementById('adminEditModal').classList.add('hidden'));

document.getElementById('adminEditForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('adminEditAppId').value;
    const hasCase = document.getElementById('adminHasCase').checked;

    const appData = {
        program_type: document.getElementById('adminProg').value,
        stream: document.getElementById('adminStream').value,
        noc_code: document.getElementById('adminNoc').value,
        submission_date: document.getElementById('adminSubDate').value,
        work_permit_expiry: document.getElementById('adminWpExpiry').value,
        status: document.getElementById('adminStatus').value,
        status_note: document.getElementById('adminStatusNote').value,
        ns_graduate: document.getElementById('adminNsGrad').checked,
        nominated_date: (document.getElementById('adminStatus').value === 'Nominated' || document.getElementById('adminStatus').value === 'Endorsed')
            ? document.getElementById('adminNominatedDate').value : null,
        has_case_number: hasCase,
        case_number_date: hasCase ? document.getElementById('adminCaseDate').value : null
    };

    try {
        await api.updateAdminApplication(id, appData);
        ui.showToast('Application updated', 'success');
        document.getElementById('adminEditModal').classList.add('hidden');
        loadAdminApps();
    } catch (err) {
        ui.showToast(err.message, 'error');
    }
});

// CSV Export Listener
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    const apps = adminState.apps;
    if (!apps || apps.length === 0) {
        ui.showToast('No applications to export based on current filters.', 'warning');
        return;
    }

    const headers = ['User Email', 'Program', 'Stream', 'NOC', 'Status', 'Submitted', 'WP Expiry', 'Waiting Months', 'Risk Level', 'NS Graduate', 'Has Case Number', 'Case Number Date', 'Note'];
    const csvRows = [headers.join(',')];

    for (const a of apps) {
        // Enclose strings in quotes and double-up any quotes inside notes
        const row = [
            `"${a.user_email}"`,
            `"${a.program_type}"`,
            `"${a.stream}"`,
            `"${a.noc_code}"`,
            `"${a.status}"`,
            `"${a.submission_date}"`,
            `"${a.work_permit_expiry}"`,
            `"${a.waiting_months}"`,
            `"${a.risk_level}"`,
            `"${a.ns_graduate ? 'Yes' : 'No'}"`,
            `"${a.has_case_number ? 'Yes' : 'No'}"`,
            `"${a.case_number_date || ''}"`,
            `"${(a.status_note || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ircc_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ===== MOBILE NAVIGATION =====
const sidebar = document.querySelector('.sidebar');
const backdrop = document.getElementById('sidebarBackdrop');

function toggleSidebar() {
    const isOpen = sidebar?.classList.toggle('sidebar--open');
    document.body.classList.toggle('sidebar-is-open', isOpen);
    backdrop?.classList.toggle('active', isOpen);
}

document.getElementById('mobileNavToggle')?.addEventListener('click', toggleSidebar);
backdrop?.addEventListener('click', toggleSidebar);

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const toggle = document.getElementById('mobileNavToggle');
    if (window.innerWidth <= 1024 && sidebar?.classList.contains('sidebar--open')) {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target) && !backdrop.contains(e.target)) {
            toggleSidebar();
        }
    }
});
