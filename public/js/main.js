// ===== APP STATE =====
const state = {
    user: null,
    apps: [],
    stats: null,
    table: {
        rows: [],
        pagination: {},
        filters: {
            noc_code: '',
            status: '',
            risk_level: ''
        },
        sort: 'submission_date',
        order: 'desc',
        page: 1
    }
};

// Global for pagination access
window.handlePageChange = (page) => {
    state.table.page = page;
    loadTableData();
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    state.user = api.getUser();
    initAuth();
    if (state.user) {
        showApp();
    }
});

// ===== AUTH FLOW =====
function initAuth() {
    const authForm = document.getElementById('authForm');
    const authToggleLink = document.getElementById('authToggleLink');
    const logoutBtn = document.getElementById('logoutBtn');

    let isLogin = true;

    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        document.getElementById('authTitle').innerText = isLogin ? 'Welcome Back' : 'Create Account';
        document.getElementById('authDesc').innerText = isLogin ? 'Sign in to your tracker' : 'Join the immigration community';
        document.getElementById('authSubmitBtn').innerText = isLogin ? 'Sign In' : 'Sign Up';
        document.getElementById('authToggleText').innerText = isLogin ? "Don't have an account?" : "Already have an account?";
        authToggleLink.innerText = isLogin ? 'Create one' : 'Sign In';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const errorEl = document.getElementById('authError');

        try {
            const data = isLogin ? await api.login(email, password) : await api.register(email, password);
            state.user = data.user;
            showApp();
            ui.showToast(`Welcome, ${state.user.email}!`, 'success');
        } catch (err) {
            errorEl.innerText = err.message;
            errorEl.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        api.logout();
        window.location.reload();
    });
}

function showApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
    document.getElementById('navUserEmail').innerText = state.user.email;

    // Admin link
    if (state.user.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        const roleBadge = document.getElementById('navRoleBadge');
        adminLink.classList.remove('hidden');
        roleBadge.classList.remove('hidden');
        roleBadge.innerText = 'Admin';
        roleBadge.classList.add('role-badge--admin');
    }

    // Load data
    loadUserData();
    loadAggregateData();
    loadTableData();
    loadAnnouncement();
    initFilters();
    initTableControls();
}

async function loadAnnouncement() {
    try {
        const data = await api.getActiveAnnouncement();
        const bannerContainer = document.getElementById('systemAnnouncement');
        const textContainer = bannerContainer.querySelector('.announcement-text');

        if (data && data.announcement) {
            textContainer.innerText = data.announcement.message;
            bannerContainer.classList.remove('hidden');
        } else {
            bannerContainer.classList.add('hidden');
        }
    } catch (err) {
        console.error('Failed to load announcements', err);
    }
}

// ===== USER DATA =====
async function loadUserData() {
    try {
        const data = await api.getMyApplications();
        state.apps = data;
        renderApplications();
    } catch (err) {
        ui.showToast('Failed to load applications', 'error');
    }
}

function renderApplications() {
    const container = document.getElementById('applicationsContainer');
    if (state.apps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">📋</div>
                <h3 class="empty-state__title">No Applications Yet</h3>
                <p class="empty-state__desc">Add your PNP or AIP application to start tracking your waiting time and work permit expiry.</p>
                <button class="btn btn--primary" onclick="app.openModal()">Add My First Application</button>
            </div>
        `;
        return;
    }
    container.innerHTML = state.apps.map(a => ui.renderApplicationCard(a)).join('');
}

// ===== AGGREGATE STATS =====
async function loadAggregateData() {
    const program = document.getElementById('filterProgram').value;
    const stream = document.getElementById('filterStream').value;
    const noc = document.getElementById('filterNoc').value;

    try {
        const data = await api.getAggregatedStats({ program_type: program, stream, noc_code: noc });
        state.stats = data;

        document.getElementById('statCards').innerHTML = ui.renderStatCards(data.stats);
        charts.updateCharts(data);

        // Populate NOC filter if not already populated
        populateNocFilter(data.nocCodes, 'filterNoc');
        populateNocFilter(data.nocCodes, 'tableFilterNoc');
    } catch (err) {
        console.error(err);
    }
}

function populateNocFilter(nocCodes, elementId) {
    const el = document.getElementById(elementId);
    const currentVal = el.value;
    el.innerHTML = '<option value="">All NOC Codes</option>' +
        nocCodes.map(n => `<option value="${n.noc_code}">${n.noc_code} (${n.count})</option>`).join('');
    el.value = currentVal;
}

// ===== TABLE DATA =====
async function loadTableData() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"></div></td></tr>';

    try {
        const program = document.getElementById('filterProgram').value;
        const stream = document.getElementById('filterStream').value;

        const data = await api.getStatsTable({
            program_type: program,
            stream: stream,
            noc_code: state.table.filters.noc_code,
            status: state.table.filters.status,
            risk_level: state.table.filters.risk_level,
            ns_graduate: state.table.filters.ns_graduate,
            sort: state.table.sort,
            order: state.table.order,
            page: state.table.page,
            limit: 15
        });

        state.table.rows = data.rows;
        state.table.pagination = data.pagination;

        tableBody.innerHTML = ui.renderTableRows(data.rows);
        document.getElementById('tablePagination').innerHTML = ui.renderPagination(data.pagination);
    } catch (err) {
        ui.showToast('Failed to load applicant table', 'error');
    }
}

// ===== FILTERS & CONTROLS =====
function initFilters() {
    const filterIds = ['filterProgram', 'filterStream', 'filterNoc'];
    filterIds.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            if (id === 'filterProgram') updateStreamOptions();
            loadAggregateData();
            loadTableData(); // Table also depends on main filters
        });
    });

    const tableFilterIds = ['tableFilterNoc', 'tableFilterStatus', 'tableFilterRisk', 'tableFilterGraduate'];
    tableFilterIds.forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            const field = id.replace('tableFilter', '').toLowerCase();
            if (field === 'graduate') {
                state.table.filters.ns_graduate = e.target.value;
            } else {
                const key = field === 'noc' ? 'noc_code' : field === 'risk' ? 'risk_level' : field;
                state.table.filters[key] = e.target.value;
            }
            state.table.page = 1;
            loadTableData();
        });
    });
}

function updateStreamOptions() {
    const program = document.getElementById('filterProgram').value;
    const streamSelect = document.getElementById('filterStream');

    let options = '<option value="">All Streams</option>';
    if (program && STREAMS[program]) {
        options += STREAMS[program].map(s => `<option value="${s}">${s}</option>`).join('');
    }
    streamSelect.innerHTML = options;
}

function initTableControls() {
    const headers = document.querySelectorAll('#applicantTable th[data-sort]');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const sort = th.dataset.sort;
            if (state.table.sort === sort) {
                state.table.order = state.table.order === 'asc' ? 'desc' : 'asc';
            } else {
                state.table.sort = sort;
                state.table.order = 'desc';
            }

            // Update UI markers
            headers.forEach(h => h.classList.remove('sort-active'));
            th.classList.add('sort-active');

            loadTableData();
        });
    });
}

// ===== APPLICATION MODAL & ACTIONS =====
// Global 'app' object for onclick access
window.app = {
    openModal(id = null) {
        const modal = document.getElementById('appModal');
        const form = document.getElementById('appForm');
        const title = document.getElementById('modalTitle');

        form.reset();
        document.getElementById('editAppId').value = id || '';

        if (id) {
            const appData = state.apps.find(a => a.id === id);
            if (appData) {
                title.innerText = 'Edit Application';
                document.getElementById('programType').value = appData.program_type;
                updateStreamOptionsInForm();
                document.getElementById('stream').value = appData.stream;
                document.getElementById('nocCode').value = appData.noc_code;
                document.getElementById('submissionDate').value = appData.submission_date;
                document.getElementById('workPermitExpiry').value = appData.work_permit_expiry;
                document.getElementById('appStatus').value = appData.status;
                document.getElementById('statusNote').value = appData.status_note || '';
                document.getElementById('nsGraduate').checked = !!appData.ns_graduate;

                const hasCaseNumCb = document.getElementById('hasCaseNumber');
                hasCaseNumCb.checked = !!appData.has_case_number;
                document.getElementById('caseNumberDate').value = appData.case_number_date || '';
                document.getElementById('caseNumberDateContainer').classList.toggle('hidden', !hasCaseNumCb.checked);
            }
        } else {
            title.innerText = 'Add Application';
            document.getElementById('statusNote').value = '';
            document.getElementById('nsGraduate').checked = false;

            const hasCaseNumCb = document.getElementById('hasCaseNumber');
            hasCaseNumCb.checked = false;
            document.getElementById('caseNumberDate').value = '';
            document.getElementById('caseNumberDateContainer').classList.add('hidden');
        }

        modal.classList.remove('hidden');
    },

    async deleteApplication(id) {
        if (!confirm('Are you sure you want to delete this application?')) return;
        try {
            await api.deleteApplication(id);
            ui.showToast('Application deleted', 'success');
            loadUserData();
            loadAggregateData();
            loadTableData();
        } catch (err) {
            ui.showToast(err.message, 'error');
        }
    },

    editApplication(id) {
        this.openModal(id);
    }
};

// Modal events
document.getElementById('addAppBtn').addEventListener('click', () => app.openModal());
document.getElementById('modalCloseBtn').addEventListener('click', () => document.getElementById('appModal').classList.add('hidden'));
document.getElementById('modalCancelBtn').addEventListener('click', () => document.getElementById('appModal').classList.add('hidden'));

document.getElementById('hasCaseNumber').addEventListener('change', (e) => {
    document.getElementById('caseNumberDateContainer').classList.toggle('hidden', !e.target.checked);
    if (!e.target.checked) document.getElementById('caseNumberDate').value = '';
});

document.getElementById('programType').addEventListener('change', updateStreamOptionsInForm);

function updateStreamOptionsInForm() {
    const program = document.getElementById('programType').value;
    const streamSelect = document.getElementById('stream');
    let options = '<option value="">Select stream…</option>';
    if (program && STREAMS[program]) {
        options += STREAMS[program].map(s => `<option value="${s}">${s}</option>`).join('');
    }
    streamSelect.innerHTML = options;
}

document.getElementById('appForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editAppId').value;
    const hasCaseNum = document.getElementById('hasCaseNumber').checked;
    const appData = {
        program_type: document.getElementById('programType').value,
        stream: document.getElementById('stream').value,
        noc_code: document.getElementById('nocCode').value,
        submission_date: document.getElementById('submissionDate').value,
        work_permit_expiry: document.getElementById('workPermitExpiry').value,
        status: document.getElementById('appStatus').value,
        status_note: document.getElementById('statusNote').value,
        ns_graduate: document.getElementById('nsGraduate').checked,
        has_case_number: hasCaseNum,
        case_number_date: hasCaseNum ? document.getElementById('caseNumberDate').value : null
    };

    try {
        const res = id ? await api.updateApplication(id, appData) : await api.createApplication(appData);
        if (res.error) throw new Error(res.error);

        document.getElementById('appModal').classList.add('hidden');
        ui.showToast(id ? 'Application updated' : 'Application added', 'success');
        loadUserData();
        loadAggregateData();
        loadTableData();
    } catch (err) {
        ui.showToast(err.message, 'error');
    }
});
