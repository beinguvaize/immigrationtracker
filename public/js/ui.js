const ui = {
    // ===== TOASTS =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span>${icons[type] || ''}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    // ===== MY APPLICATIONS TABLE (Dashboard View) =====
    renderMyApplicationsTable(apps) {
        if (!apps || apps.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state__icon">📋</div>
                    <h3 class="empty-state__title">No Applications Yet</h3>
                    <p class="empty-state__desc">Add your PNP or AIP application to start tracking your waiting time and work permit expiry.</p>
                    <button class="btn btn--primary" onclick="app.openModal()">Add My First Application</button>
                </div>
            `;
        }

        const rows = apps.map(app => {
            const noc = (typeof lookupNOC === 'function') ? lookupNOC(app.noc_code) : null;
            const jobTitle = noc ? noc.title : '';
            const teer = noc ? noc.teer : null;

            return `
            <tr>
                <td>
                    <div class="app-info-cell">
                        <div class="app-info-cell__program">${app.program_type}</div>
                        <div class="app-info-cell__stream">${app.stream}</div>
                    </div>
                </td>
                <td class="cell-mono">
                    <div style="font-weight:600">${app.noc_code}</div>
                    ${jobTitle ? `<div class="job-title-cell" style="font-size:11px; margin-top:2px; font-weight:normal;">${jobTitle}</div>` : ''}
                    ${teer !== null ? `<span style="font-size:10px; padding:1px 6px; border-radius:10px; background:var(--bg-accent-light); color:var(--bg-accent); font-weight:700;">TEER ${teer}</span>` : ''}
                </td>
                <td>${this.formatDate(app.submission_date)}</td>
                <td>
                    <div class="status-pill status-pill--${app.status.toLowerCase().replace(/ /g, '-')}">
                        <div class="status-pill__dot"></div>
                        ${app.status === 'Nominated' ? 'Nominated / Endorsed' : app.status}
                    </div>
                </td>
                <td class="cell-mono">${this.formatWaitTime(app.waiting_months)}</td>
                <td>
                    <div class="risk-indicator risk-indicator--${app.risk_level}">
                        <span class="risk-indicator__icon">${this.getRiskIcon(app.risk_level)}</span>
                        ${this.getRiskLabel(app.risk_level)}
                    </div>
                </td>
                <td>
                    <div class="app-actions-cell">
                        <button class="btn btn--secondary btn--sm" onclick="app.editApplication(${app.id})">Edit</button>
                        <button class="btn btn--ghost btn--sm" style="color: var(--accent-danger)" onclick="app.deleteApplication(${app.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `}).join('');

        return `
            <div class="table-card table-card--dashboard">
                <div class="table-wrapper">
                    <table class="data-table data-table--simple">
                        <thead>
                            <tr>
                                <th>Program & Stream</th>
                                <th>NOC</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Waiting</th>
                                <th>Work Permit Risk</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Legacy card renderer kept for compatibility or other views if needed
    renderApplicationCard(app) {
        return `
            <div class="app-card" id="app-${app.id}">
                <div class="app-card__header">
                    <div class="app-card__meta">
                        <span class="app-tag">${app.program_type}</span>
                        <span class="app-tag">${app.stream}</span>
                        <span class="app-tag app-tag--noc">NOC ${app.noc_code}</span>
                    </div>
                    <div class="status-pill status-pill--${app.status.toLowerCase().replace(/ /g, '-')}">
                        <div class="status-pill__dot"></div>
                        ${app.status === 'Nominated' ? 'Nominated / Endorsed' : app.status}
                    </div>
                </div>

                <div class="waiting-display">
                    <div class="waiting-display__label">Verification Journey</div>
                    <div class="waiting-display__value">${app.waiting_months}</div>
                    <div class="waiting-display__unit">Total Months (${this.formatWaitTime(app.waiting_months)})</div>
                    
                    <div class="waiting-display__breakdown">
                        <div class="waiting-display__item">
                            <div class="waiting-display__item-value">${Math.floor(app.waiting_months / 12)}</div>
                            <div class="waiting-display__item-label">Yrs</div>
                        </div>
                        <div class="waiting-display__item">
                            <div class="waiting-display__item-value">${Math.floor(app.waiting_months % 12)}</div>
                            <div class="waiting-display__item-label">Mos</div>
                        </div>
                        <div class="waiting-display__item">
                            <div class="waiting-display__item-value">${Math.round((app.waiting_months % 1) * 30.44)}</div>
                            <div class="waiting-display__item-label">Days</div>
                        </div>
                    </div>
                </div>

                <div class="permit-countdown">
                    <div class="permit-countdown__info">
                        <div class="permit-countdown__label">Work Permit</div>
                        <div class="permit-countdown__value">${this.formatWaitTime(app.days_remaining / 30.44)}</div>
                    </div>
                    <div class="risk-indicator risk-indicator--${app.risk_level}">
                        <span class="risk-indicator__icon">${this.getRiskIcon(app.risk_level)}</span>
                        ${this.getRiskLabel(app.risk_level)}
                    </div>
                </div>

                ${app.ns_graduate ? `
                <div class="app-card__badge app-card__badge--grad">
                    🎓 NS Graduate
                </div>
                ` : ''}

                ${app.nominated_date ? `
                <div class="app-card__badge app-card__badge--nominated">
                    🏆 Nominated on: ${this.formatDate(app.nominated_date)}
                </div>
                ` : ''}

                ${app.status_note ? `
                <div class="app-card__note">
                    "${app.status_note}"
                </div>
                ` : ''}

                <div class="app-card__actions">
                    <button class="btn btn--secondary btn--sm" onclick="app.editApplication(${app.id})">Edit</button>
                    <button class="btn btn--ghost btn--sm" style="color: var(--accent-danger)" onclick="app.deleteApplication(${app.id})">Delete</button>
                </div>
            </div>
        `;
    },

    getRiskIcon(level) {
        const icons = { green: '✅', yellow: '⚠️', red: '🚨', expired: '❌' };
        return icons[level] || '❓';
    },

    getRiskLabel(level) {
        const labels = { green: 'Safe', yellow: 'Caution', red: 'Critical', expired: 'Expired' };
        return labels[level] || 'Unknown';
    },

    // ===== STAT CARDS (Nova Scotia Immigration Tracker Style) =====
    renderStatCards(stats, programBreakdown) {
        // Build per-program stacked rows (each program on its own line)
        const getBreakdownLines = (field) => {
            if (!programBreakdown || programBreakdown.length === 0) return '<div style="color:var(--text-muted); font-size:12px;">No data</div>';
            return programBreakdown.map(p => {
                let val = p[field];
                if (field === 'pct_nominated') val = (val || 0) + '%';
                else if (field === 'avg_waiting' || field === 'max_waiting') val = this.formatWaitTime(val);
                return `<div style="display:flex; flex-direction:column; align-items:center; padding:4px 0; border-top:1px solid rgba(0,0,0,0.05); width:100%;">
                    <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">${p.program_type}</div>
                    <div style="font-size:var(--fs-md); font-weight:800; color:var(--text-primary);">${val}</div>
                </div>`;
            }).join('');
        };

        return `
            <div class="stat-card stat-card--featured">
                <div class="stat-card__label">Total Applicants</div>
                <div class="stat-card__value" style="font-size: var(--fs-3xl); margin: var(--space-2) 0;">
                    ${stats.total_applicants}
                </div>
                <div class="stat-card__trend trend--up" style="font-size:11px; color:var(--text-muted);">
                    Increased from last month
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Avg. Waiting Time</div>
                <div style="margin-top:var(--space-1); width:100%;">
                    ${getBreakdownLines('avg_waiting')}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Nomination Success</div>
                <div style="margin-top:var(--space-2);">
                    ${getBreakdownLines('pct_nominated')}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Longest Wait</div>
                <div style="margin-top:var(--space-2);">
                    ${getBreakdownLines('max_waiting')}
                </div>
            </div>
        `;
    },

    // ===== RECENT SUCCESSES WIDGET (Table Layout) =====
    renderRecentSuccesses(successes) {
        if (!successes || successes.length === 0) return '';

        const items = successes.slice(0, 6);

        const cards = items.map(s => {
            const noc = (typeof lookupNOC === 'function') ? lookupNOC(s.noc_code) : null;
            const jobTitle = noc ? noc.title : s.noc_code;
            const teer = noc ? noc.teer : null;
            const daysAgo = this.getDaysAgo(s.nominated_date);

            return `
            <div class="success-card">
                <div class="success-card__icon">🏆</div>
                <div class="success-card__body">
                    <div class="success-card__title">${jobTitle}</div>
                    <div class="success-card__meta">NOC ${s.noc_code}${teer !== null ? ` · TEER ${teer}` : ''}</div>
                    <div class="success-card__tags">
                        <span class="success-card__program">${s.program_type}</span>
                        <span class="success-card__date">${daysAgo}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        return `
            <div class="success-section">
                <div class="section-header" style="margin-bottom: var(--space-4)">
                    <h3 class="section-title" style="font-size: var(--fs-md)">Recent Successes</h3>
                </div>
                <div class="success-cards-grid">
                    ${cards}
                </div>
            </div>
        `;
    },

    getDaysAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 30) return `${diff} days ago`;
        return this.formatDate(dateStr);
    },

    // ===== TABLE RENDERING =====
    renderTableRows(rows) {
        if (!rows || rows.length === 0) {
            return `<tr><td colspan="8" style="text-align: center; padding: var(--space-10); color: var(--text-muted);">No matching applications found</td></tr>`;
        }

        return rows.map(row => {
            const noc = (typeof lookupNOC === 'function') ? lookupNOC(row.noc_code) : null;
            const jobTitle = noc ? noc.title : '';
            const teer = noc ? noc.teer : null;
            const tooltip = row.status_note ? `Note: ${row.status_note}` : 'No note provided';
            return `
            <tr title="${tooltip.replace(/"/g, '&quot;')}">
                <td style="font-weight: var(--fw-bold)">${row.program_type}</td>
                <td style="font-size: 11px; opacity: 0.8;">${row.stream}</td>
                <td class="cell-mono">
                    <div style="font-weight:600">${row.noc_code}</div>
                    ${jobTitle ? `<div class="job-title-cell">${jobTitle}</div>` : ''}
                    ${teer !== null ? `<span style="font-size:10px; padding:1px 6px; border-radius:10px; background:var(--bg-accent-light); color:var(--bg-accent); font-weight:700;">TEER ${teer}</span>` : ''}
                </td>
                <td>${this.formatDate(row.submission_date)}</td>
                <td>
                    <span class="status-pill status-pill--${row.status.toLowerCase().replace(/ /g, '-')}">${row.status}</span>
                </td>
                <td class="cell-mono">${this.formatWaitTime(row.waiting_months)}</td>
                <td style="text-align:center;" class="cell-mono">${row.days_remaining != null ? this.formatWaitTime(row.days_remaining / 30.44) : '—'}</td>
                <td>
                    <span class="cell-risk cell-risk--${row.risk_level}">
                        ${this.getRiskLabel(row.risk_level)}
                    </span>
                </td>
                <td style="text-align: center;">${row.ns_graduate ? '🎓' : '—'}</td>
                <td style="text-align: center; font-size:12px;">
                    ${row.has_case_number ? `<span style="color:var(--clr-green); font-weight:600;">✓</span>${row.case_number_date ? `<div style="font-size:10px;color:var(--text-muted)">${this.formatDate(row.case_number_date)}</div>` : ''}` : '—'}
                </td>
            </tr>
        `}).join('');
    },

    renderPagination(pagination, callbackName = 'handlePageChange') {
        const { page, totalPages } = pagination;
        if (totalPages <= 1) return '';

        let buttons = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
                buttons += `
                    <button class="pagination-btn ${i === page ? 'pagination-btn--active' : ''}" 
                            onclick="window.${callbackName}(${i})">${i}</button>
                `;
            } else if (i === page - 3 || i === page + 3) {
                buttons += `<span class="pagination-dots">...</span>`;
            }
        }

        return `
            <div class="pagination">
                <div class="pagination__info">Showing page <strong>${page}</strong> of <strong>${totalPages}</strong></div>
                <div class="pagination__controls">
                    ${buttons}
                </div>
            </div>
        `;
    },

    formatWaitTime(months) {
        if (!months && months !== 0) return '—';
        const totalDays = Math.round(months * 30.44);
        if (totalDays < 30) return totalDays + (totalDays === 1 ? ' day' : ' days');
        if (months < 12) return Math.round(months) + ' mo';
        const yrs = months / 12;
        if (months % 12 === 0) return Math.floor(yrs) + ' yr';
        return yrs.toFixed(1) + ' yr';
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';

        let normalized = dateStr;
        if (dateStr.includes(' ')) {
            // Convert "YYYY-MM-DD HH:MM:SS" to "YYYY-MM-DDTHH:MM:SS"
            normalized = dateStr.replace(' ', 'T');
        } else if (!dateStr.includes('T')) {
            // Force local time for "YYYY-MM-DD"
            normalized = dateStr + 'T00:00:00';
        }

        const date = new Date(normalized);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    },

    // ===== ADMIN UI =====
    renderAdminStats(stats) {
        const items = [
            { label: 'Active Users', value: stats.totalUsers || 0, trend: 'Total in system' },
            { label: 'Applications', value: stats.totalApplications || 0, trend: '+12.5% this month' },
            { label: 'Avg. Wait', value: this.formatWaitTime(stats.avgWaitingMonths), trend: 'Global benchmark' },
            { label: 'Successes', value: stats.nominatedApplications || 0, trend: 'Confirmed wins' },
            { label: 'Success Rate', value: stats.totalApplications ? Math.round((stats.nominatedApplications / stats.totalApplications) * 100) + '%' : '0%', trend: 'Nomination ratio' }
        ];

        return items.map((item, idx) => `
            <div class="stat-card ${idx === 0 ? 'stat-card--featured' : ''}">
                <div class="stat-card__label">${item.label}</div>
                <div class="stat-card__value">${item.value}</div>
                <div class="stat-card__trend">${item.trend}</div>
            </div>
        `).join('');
    }
};
