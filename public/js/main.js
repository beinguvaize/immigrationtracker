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
            risk_level: '',
            stream: ''
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
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const confirmInput = document.getElementById('authConfirmPassword');

    let isLogin = true;

    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        document.getElementById('authTitle').innerText = isLogin ? 'Welcome Back' : 'Create Account';
        document.getElementById('authDesc').innerText = isLogin ? 'Sign in to your tracker' : 'Join the immigration community';
        document.getElementById('authSubmitBtn').innerText = isLogin ? 'Sign In' : 'Sign Up';
        document.getElementById('authToggleText').innerText = isLogin ? "Don't have an account?" : "Already have an account?";
        authToggleLink.innerText = isLogin ? 'Create one' : 'Sign In';

        // Show/hide confirm password
        confirmGroup.classList.toggle('hidden', isLogin);
        if (isLogin) {
            confirmInput.removeAttribute('required');
            confirmInput.value = '';
        } else {
            confirmInput.setAttribute('required', '');
        }
    });

    // Password visibility toggles
    function setupPasswordToggle(toggleId, inputId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        if (!toggle || !input) return;
        toggle.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.title = isPassword ? 'Hide password' : 'Show password';
            toggle.style.opacity = isPassword ? '1' : '0.5';
        });
    }
    setupPasswordToggle('togglePassword', 'authPassword');
    setupPasswordToggle('toggleConfirmPassword', 'authConfirmPassword');

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const errorEl = document.getElementById('authError');

        // Validate password match on signup
        if (!isLogin) {
            const confirmPw = confirmInput.value;
            if (password !== confirmPw) {
                errorEl.innerText = 'Passwords do not match.';
                errorEl.classList.remove('hidden');
                return;
            }
        }

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

    // Populate Header Profile
    const userNameEl = document.getElementById('navUserName');
    const userEmailEl = document.getElementById('navUserEmailSpan');
    if (userNameEl) userNameEl.innerText = state.user.email.split('@')[0];
    if (userEmailEl) userEmailEl.innerText = state.user.email;

    // Admin link
    if (state.user.role === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.classList.remove('hidden');
    }

    // Load data
    loadUserData();
    loadAggregateData();
    loadTableData();
    loadAnnouncement();
    initFilters();
    initTableControls();
    initNavigation();
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.side-nav__link[data-panel]');
    const panels = document.querySelectorAll('.app-panel');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPanelId = link.getAttribute('data-panel');
            if (!targetPanelId) return;

            // Update active link
            navLinks.forEach(l => l.classList.remove('side-nav__link--active'));
            link.classList.add('side-nav__link--active');

            // Switch panels
            panels.forEach(panel => {
                const isTarget = panel.id === `panel${targetPanelId.charAt(0).toUpperCase() + targetPanelId.slice(1)}`;
                panel.classList.toggle('app-panel--active', isTarget);
            });

            // Close sidebar on mobile
            if (window.innerWidth <= 1024) {
                toggleSidebar();
            }
        });
    });
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
                <div class="empty-state__icon"><i class="fa-solid fa-folder-open"></i></div>
                <h3 class="empty-state__title">No Applications Yet</h3>
                <p class="empty-state__desc">Add your PNP or AIP application to start tracking your waiting time and work permit expiry.</p>
                <button class="btn btn--primary" onclick="app.openModal()">Add My First Application</button>
            </div>
        `;
        return;
    }
    container.innerHTML = ui.renderMyApplicationsTable(state.apps);
}

// ===== AGGREGATE STATS =====
async function loadAggregateData() {
    const program = document.getElementById('filterProgram').value;
    const stream = document.getElementById('filterStream').value;
    const noc = document.getElementById('filterNoc').value;

    try {
        const data = await api.getAggregatedStats({ program_type: program, stream, noc_code: noc });
        state.stats = data;

        const aggStatsEl = document.getElementById('aggregateStatCards');
        if (aggStatsEl) {
            aggStatsEl.innerHTML = ui.renderStatCards(data.stats, data.programBreakdown);
        }

        // Render recent successes (if any)
        const successesContainer = document.getElementById('recentSuccessesContainer');
        if (successesContainer) {
            successesContainer.innerHTML = ui.renderRecentSuccesses(data.recentSuccesses);
        }

        if (window.charts && charts.updateCharts) {
            charts.updateCharts(data);
        }

        // Populate NOC filter if not already populated
        if (typeof populateNocFilter === 'function') {
            populateNocFilter(data.nocCodes, 'filterNoc');
            populateNocFilter(data.nocCodes, 'tableFilterNoc');
        }
    } catch (err) {
        console.error('Failed to load aggregated data', err);
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
        const globalProgram = document.getElementById('filterProgram').value;
        const globalStream = document.getElementById('filterStream').value;
        const tableStream = state.table.filters.stream;

        const data = await api.getStatsTable({
            // If table stream is selected, ignore global program to keep it "standalone"
            program_type: tableStream ? '' : globalProgram,
            stream: tableStream || globalStream,
            noc_code: state.table.filters.noc_code,
            status: state.table.filters.status,
            risk_level: state.table.filters.risk_level,
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
    // Initialize standalone table stream filter once
    initTableStreamFilter();

    const filterIds = ['filterProgram', 'filterStream', 'filterNoc'];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                if (id === 'filterProgram') updateStreamOptions();
                loadAggregateData();
                loadTableData();
            });
        }
    });

    const tableFilterIds = ['tableFilterNoc', 'tableFilterStatus', 'tableFilterRisk', 'tableFilterStream'];
    tableFilterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                const field = id.replace('tableFilter', '').toLowerCase();
                const key = field === 'noc' ? 'noc_code' : field === 'risk' ? 'risk_level' : field;
                state.table.filters[key] = e.target.value;
                state.table.page = 1;
                loadTableData();
            });
        }
    });
}

function initTableStreamFilter() {
    const tableStreamSelect = document.getElementById('tableFilterStream');
    if (!tableStreamSelect) return;

    let options = '<option value="">All Streams</option>';

    // Grouped Options
    options += '<optgroup label="Grouped Options">';
    options += '<option value="All AIP">All AIP</option>';
    options += '<option value="NS PNP Express Entry">NS PNP Express Entry</option>';
    options += '<option value="NS PNP Non Express Entry">NS PNP Non Express Entry</option>';
    options += '<option value="All NS PNP">All NS PNP</option>';
    options += '</optgroup>';

    // AIP Streams
    options += '<optgroup label="Atlantic Immigration Program (AIP)">';
    options += STREAMS['AIP'].map(s => `<option value="${s}">${s}</option>`).join('');
    options += '</optgroup>';

    // NS PNP Streams
    options += '<optgroup label="Nova Scotia PNP">';
    options += STREAMS['NS PNP'].map(s => `<option value="${s}">${s}</option>`).join('');
    options += '</optgroup>';

    tableStreamSelect.innerHTML = options;
}

function updateStreamOptions() {
    const program = document.getElementById('filterProgram').value;
    const streamSelect = document.getElementById('filterStream');

    let options = '<option value="">All Streams</option>';

    // Add grouped options
    if (program === 'NS PNP') {
        options += '<option value="All NS PNP">All NS PNP</option>';
        options += '<option value="NS PNP Express Entry">NS PNP Express Entry</option>';
        options += '<option value="NS PNP Non Express Entry">NS PNP Non Express Entry</option>';
    } else if (program === 'AIP') {
        options += '<option value="All AIP">All AIP</option>';
    }

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
                toggleNominatedDateField();
                document.getElementById('nominatedDate').value = appData.nominated_date || '';
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
            document.getElementById('nominatedDate').value = '';
            document.getElementById('nominatedDateContainer').classList.add('hidden');

            const hasCaseNumCb = document.getElementById('hasCaseNumber');
            hasCaseNumCb.checked = false;
            document.getElementById('caseNumberDate').value = '';
            document.getElementById('caseNumberDateContainer').classList.add('hidden');
        }

        modal.classList.remove('hidden');
    },

    async deleteApplication(id) {
        console.log(`[APP] deleteApplication called for id: ${id}`);
        if (!confirm('Are you sure you want to delete this application?')) return;
        try {
            console.log(`[APP] Sending delete request for id: ${id}`);
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

// Show/hide nominated date based on status
function toggleNominatedDateField() {
    const status = document.getElementById('appStatus').value;
    const container = document.getElementById('nominatedDateContainer');
    const label = document.getElementById('nominatedDateLabel');

    if (status === 'Nominated' || status === 'Endorsed' || status === 'Selected for EOI') {
        container.classList.remove('hidden');
        if (status === 'Selected for EOI') {
            label.innerText = 'Selection Date';
        } else {
            label.innerText = 'When were you nominated?';
        }
    } else {
        container.classList.add('hidden');
        document.getElementById('nominatedDate').value = '';
    }
}

document.getElementById('appStatus').addEventListener('change', toggleNominatedDateField);

document.getElementById('programType').addEventListener('change', updateStreamOptionsInForm);

function updateStreamOptionsInForm() {
    const program = document.getElementById('programType').value;
    const streamSelect = document.getElementById('stream');
    let options = '<option value="">Select stream...</option>';
    if (program && STREAMS[program]) {
        options += STREAMS[program].map(s => `<option value="${s}">${s}</option>`).join('');
    }
    streamSelect.innerHTML = options;
}

// ===== NOC CODE LIVE LOOKUP =====
document.getElementById('nocCode').addEventListener('input', function () {
    const code = this.value.trim();
    const badge = document.getElementById('nocLookupBadge');
    const titleEl = document.getElementById('nocJobTitle');
    const teerEl = document.getElementById('nocTeerBadge');
    const notFound = document.getElementById('nocNotFoundMsg');

    badge.style.display = 'none';
    notFound.style.display = 'none';

    if (code.length === 5 && typeof lookupNOC === 'function') {
        const result = lookupNOC(code);
        if (result) {
            titleEl.textContent = result.title;
            teerEl.textContent = `TEER ${result.teer}`;
            badge.style.display = 'block';
        } else {
            notFound.style.display = 'block';
        }
    }
});

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
        case_number_date: hasCaseNum ? document.getElementById('caseNumberDate').value : null,
        nominated_date: document.getElementById('appStatus').value === 'Nominated' ? document.getElementById('nominatedDate').value : null
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

// ===== MOBILE NAVIGATION TOGGLE =====
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
