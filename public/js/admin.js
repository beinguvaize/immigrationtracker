// ===== ADMIN STATE =====
const adminState = {
    user: null,
    stats: null,
    users: [],
    apps: [],
    currentPanel: 'overview'
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    adminState.user = api.getUser();

    if (!adminState.user || adminState.user.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    document.getElementById('adminEmail').innerText = adminState.user.email;

    initAdminNav();
    loadDashboard();

    document.getElementById('logoutBtn').addEventListener('click', () => {
        api.logout();
        window.location.href = '/';
    });
});

function initAdminNav() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const panel = item.dataset.panel;

            // UI Update
            navItems.forEach(i => i.classList.remove('admin-nav-item--active'));
            item.classList.add('admin-nav-item--active');

            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('admin-panel--active'));
            document.getElementById(`panel${panel.charAt(0).toUpperCase() + panel.slice(1)}`).classList.add('admin-panel--active');

            adminState.currentPanel = panel;
            loadPanelData(panel);
        });
    });
}

async function loadPanelData(panel) {
    if (panel === 'overview') loadDashboard();
    if (panel === 'users') loadUsers();
    if (panel === 'apps') loadAdminApps();
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

    const ctx = document.getElementById('adminProgramChart').getContext('2d');
    if (programChart) programChart.destroy();

    programChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dist.map(d => d.program_type),
            datasets: [{
                data: dist.map(d => d.count),
                backgroundColor: ['#da291c', '#3b82f6', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8' } }
            }
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
                <td>${u.email}</td>
                <td>
                    <select class="form-select btn--sm" onchange="admin.updateUserRole(${u.id}, this.value)">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>${u.app_count}</td>
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
        const graduate = document.getElementById('appFilterGraduate').value;

        const data = await api.getAdminApplications({
            program_type: program,
            status,
            search,
            ns_graduate: graduate
        });
        adminState.apps = data.applications; // Store for CSV export

        const tbody = document.getElementById('adminAppTableBody');
        tbody.innerHTML = data.applications.map(a => `
            <tr>
                <td style="text-align: center;"><input type="checkbox" class="app-checkbox" value="${a.id}" style="cursor: pointer;"></td>
                <td>${a.user_email}</td>
                <td>${a.program_type}</td>
                <td class="cell-mono">${a.noc_code}</td>
                <td><span class="cell-status status-badge--${a.status.toLowerCase()}">${a.status}</span></td>
                <td class="cell-mono">${a.waiting_months}m</td>
                <td><span class="cell-risk cell-risk--${a.risk_level}">${ui.getRiskIcon(a.risk_level)}</span></td>
                <td style="text-align: center;">${a.ns_graduate ? '🎓 Yes' : 'No'}</td>
                <td style="text-align: center;">${a.has_case_number ? a.case_number_date : 'No'}</td>
                <td style="max-width: 150px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${a.status_note || ''}">
                    ${a.status_note || '—'}
                </td>
                <td style="display: flex; gap: 4px;">
                    <button class="btn btn--secondary btn--sm" style="padding: 4px 8px; font-size: 11px;" onclick="admin.viewDetails(${a.id})">Details</button>
                    <button class="btn btn--secondary btn--sm" style="padding: 4px 8px; font-size: 11px;" onclick="admin.editApp(${a.id})">Edit</button>
                    <button class="btn btn--danger btn--sm" style="padding: 4px 8px; font-size: 11px;" onclick="admin.deleteApp(${a.id})">Delete</button>
                </td>
            </tr>
        `).join('');
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
                    <span class="status-badge status-badge--${a.active ? 'nominated' : 'refused'}" style="cursor: pointer;" onclick="admin.toggleAnnouncement(${a.id}, ${!a.active})">
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
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div><strong>User Email:</strong> <br>${appData.user_email}</div>
                <div><strong>Submission Date:</strong> <br>${ui.formatDate(appData.submission_date)}</div>
                <div><strong>Program:</strong> <br>${appData.program_type}</div>
                <div><strong>Stream:</strong> <br>${appData.stream}</div>
                <div><strong>NOC Code:</strong> <br>${appData.noc_code}</div>
                <div><strong>Status:</strong> <br><span class="status-badge status-badge--${appData.status.toLowerCase()}">${appData.status}</span></div>
                <div><strong>WP Expiry:</strong> <br>${ui.formatDate(appData.work_permit_expiry)} (${appData.days_remaining} days left)</div>
                <div><strong>NS Graduate:</strong> <br>${appData.ns_graduate ? 'Yes' : 'No'}</div>
                <div><strong>Case Number:</strong> <br>${appData.has_case_number ? ui.formatDate(appData.case_number_date) : 'No'}</div>
            </div>
            ${appData.status_note ? `<div><strong>Note:</strong><br><em style="color: var(--text-secondary);">${appData.status_note}</em></div>` : ''}
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
    document.getElementById(id).addEventListener('input', () => loadUsers());
});
['appSearch', 'appFilterProgram', 'appFilterStatus', 'appFilterGraduate'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => loadAdminApps());
});

// Admin Applications Actions
document.getElementById('selectAllApps')?.addEventListener('change', (e) => {
    document.querySelectorAll('.app-checkbox').forEach(cb => cb.checked = e.target.checked);
});

document.getElementById('applyBulkBtn')?.addEventListener('click', async () => {
    const status = document.getElementById('bulkStatusSelect').value;
    if (!status) return ui.showToast('Select a status first', 'warning');

    const selected = Array.from(document.querySelectorAll('.app-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selected.length === 0) return ui.showToast('No applications selected', 'warning');

    if (!confirm(`Update ${selected.length} applications to ${status}?`)) return;

    try {
        await api.bulkUpdateAdminStatus(selected, status);
        ui.showToast(`Updated ${selected.length} applications`, 'success');
        document.getElementById('selectAllApps').checked = false;
        document.getElementById('bulkStatusSelect').value = '';
        loadAdminApps();
    } catch (err) {
        ui.showToast(err.message, 'error');
    }
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

    const blob = new Blob([csvRows.join("\\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ircc_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
