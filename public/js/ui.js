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

        const rows = apps.map(app => `
            <tr>
                <td>
                    <div class="app-info-cell">
                        <div class="app-info-cell__program">${app.program_type}</div>
                        <div class="app-info-cell__stream">${app.stream}</div>
                    </div>
                </td>
                <td class="cell-mono">${app.noc_code}</td>
                <td>${this.formatDate(app.submission_date)}</td>
                <td>
                    <div class="status-pill status-pill--${app.status.toLowerCase()}">
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
        `).join('');

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
                    <div class="status-pill status-pill--${app.status.toLowerCase()}">
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
                        <div class="permit-countdown__value">${app.days_remaining} days</div>
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

    // ===== STAT CARDS (IRCC Tracker Style) =====
    renderStatCards(stats) {
        return `
            <div class="stat-card stat-card--featured">
                <div class="stat-card__label">Total Applicants</div>
                <div class="stat-card__value" style="color: var(--bg-accent)">
                    ${stats.total_applicants}
                </div>
                <div class="stat-card__trend trend--up">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
                    Increased from last month
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Avg. Waiting Time</div>
                <div class="stat-card__value">
                    ${this.formatWaitTime(stats.avg_waiting_months)}
                </div>
                <div class="stat-card__trend trend--up">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
                    Updated today
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Nomination Success</div>
                <div class="stat-card__value">
                    ${stats.pct_nominated}<span class="stat-card__suffix">%</span>
                </div>
                <div class="stat-card__trend trend--up">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
                    Live statistics
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Longest Wait</div>
                <div class="stat-card__value">
                    ${this.formatWaitTime(stats.max_waiting_months)}
                </div>
                <div class="stat-card__trend">
                    Across all programs
                </div>
            </div>
        `;
    },

    // ===== RECENT SUCCESSES WIDGET (Table Layout) =====
    renderRecentSuccesses(successes) {
        if (!successes || successes.length === 0) return '';

        // Limit to 5 most recent
        const items = successes.slice(0, 5);

        const rows = items.map(s => {
            const noc = (typeof lookupNOC === 'function') ? lookupNOC(s.noc_code) : null;
            const jobTitle = noc ? noc.title : s.noc_code;
            const teer = noc ? noc.teer : null;
            return `
            <tr>
                <td><div class="success-item__icon">🏆</div></td>
                <td>
                    <div style="font-weight:600; font-size:13px">${jobTitle}</div>
                    <div style="font-size:11px; color:var(--text-muted)">NOC ${s.noc_code}${teer !== null ? ` · TEER ${teer}` : ''}</div>
                </td>
                <td><span class="app-tag">${s.program_type}</span></td>
                <td><span class="text-secondary" style="font-size: 11px">Nominated: ${this.formatDate(s.nominated_date)}</span></td>
                <td class="text-secondary">${this.getDaysAgo(s.nominated_date)}</td>
            </tr>
        `}).join('');

        return `
            <div class="table-card table-card--successes">
                <div class="section-header" style="margin-bottom: var(--space-4)">
                    <h3 class="section-title" style="font-size: var(--fs-md)">Recent Successes</h3>
                </div>
                <div class="table-wrapper">
                    <table class="data-table data-table--compact">
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
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
            return `
            <tr>
                <td style="font-weight: var(--fw-bold)">${row.program_type}</td>
                <td style="font-size: 11px; opacity: 0.8;">${row.stream}</td>
                <td class="cell-mono">
                    <div style="font-weight:600">${row.noc_code}</div>
                    ${jobTitle ? `<div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${jobTitle}</div>` : ''}
                    ${teer !== null ? `<span style="font-size:10px; padding:1px 6px; border-radius:10px; background:var(--bg-accent-light); color:var(--bg-accent); font-weight:700;">TEER ${teer}</span>` : ''}
                </td>
                <td>${this.formatDate(row.submission_date)}</td>
                <td>
                    <span class="status-pill status-pill--${row.status.toLowerCase()}">${row.status}</span>
                </td>
                <td class="cell-mono">${this.formatWaitTime(row.waiting_months)}</td>
                <td style="text-align:center;" class="cell-mono">${row.days_remaining != null ? row.days_remaining + 'd' : '—'}</td>
                <td>
                    <span class="cell-risk cell-risk--${row.risk_level}">
                        ${this.getRiskLabel(row.risk_level)}
                    </span>
                </td>
                <td style="text-align: center;">${row.ns_graduate ? '🎓' : '—'}</td>
                <td style="text-align: center; font-size:12px;">
                    ${row.has_case_number ? `<span style="color:var(--clr-green); font-weight:600;">✓</span>${row.case_number_date ? `<div style="font-size:10px;color:var(--text-muted)">${this.formatDate(row.case_number_date)}</div>` : ''}` : '—'}
                </td>
                <td style="font-size:12px; color:var(--text-secondary); max-width:140px; white-space:normal; word-break:break-word;">
                    ${row.status_note || '—'}
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
        if (months < 12) return months + ' mo';

        const yrs = months / 12;
        if (months % 12 === 0) return Math.floor(yrs) + ' yr';

        return yrs.toFixed(1) + ' yr';
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    },

    // ===== ADMIN UI =====
    renderAdminStats(stats) {
        const items = [
            { label: 'Active Users', value: stats.totalUsers || 0, trend: 'Total in system' },
            { label: 'Active Today', value: Math.round((stats.totalUsers || 0) * 0.42), trend: 'Simulated activity' },
            { label: 'Applications', value: stats.totalApplications || 0, trend: '+12.5% this month' },
            { label: 'Avg. Wait', value: this.formatWaitTime(stats.avgWaitingMonths), trend: 'Global benchmark' },
            { label: 'Successes', value: stats.nominatedApplications || 0, trend: 'Confirmed wins' },
            { label: 'Success Rate', value: stats.totalApplications ? Math.round((stats.nominatedApplications / stats.totalApplications) * 100) + '%' : '0%', trend: 'Nomination ratio' }
        ];

        return items.map((item, idx) => `
            <div class="stat-card ${idx === 0 ? 'stat-card--featured' : ''}" ${idx === 0 ? 'style="background: var(--bg-accent-light); border-color: var(--bg-accent)"' : ''}>
                <div class="stat-card__label" ${idx === 0 ? 'style="color: var(--bg-accent)"' : ''}>${item.label}</div>
                <div class="stat-card__value" ${idx === 0 ? 'style="color: var(--bg-accent)"' : ''}>${item.value}</div>
                <div class="stat-card__trend" ${idx === 0 ? 'style="color: var(--bg-accent); opacity: 0.8"' : ''}>${item.trend}</div>
            </div>
        `).join('');
    }
};
