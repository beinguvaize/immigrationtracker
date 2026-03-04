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

    // ===== APPLICATION CARDS =====
    renderApplicationCard(app) {
        return `
            <div class="app-card" id="app-${app.id}">
                <div class="app-card__top">
                    <div class="app-card__meta">
                        <span class="app-card__tag">${app.program_type}</span>
                        <span class="app-card__tag">${app.stream}</span>
                        <span class="app-card__tag app-card__tag--noc">NOC ${app.noc_code}</span>
                    </div>
                    <div class="status-badge status-badge--${app.status.toLowerCase()}">
                        <div class="status-badge__dot"></div>
                        ${app.status === 'Nominated' ? 'Nominated / Endorsed' : app.status}
                    </div>
                </div>

                <div class="waiting-display">
                    <div class="waiting-display__label">You have been waiting for</div>
                    <div class="waiting-display__value">${app.waiting_months}</div>
                    <div class="waiting-display__unit">Total Months</div>
                    
                    <div class="waiting-display__breakdown">
                        <div class="waiting-display__item">
                            <div class="waiting-display__item-value">${Math.floor(app.waiting_months / 12)}</div>
                            <div class="waiting-display__item-label">Years</div>
                        </div>
                        <div class="waiting-display__item">
                            <div class="waiting-display__item-value">${Math.floor(app.waiting_months % 12)}</div>
                            <div class="waiting-display__item-label">Months</div>
                        </div>
                        <div class="waiting-display__item">
                            <div class="waiting-display__item-value">${Math.round((app.waiting_months % 1) * 30.44)}</div>
                            <div class="waiting-display__item-label">Days</div>
                        </div>
                    </div>
                </div>

                <div class="permit-countdown">
                    <div class="permit-countdown__info">
                        <div class="permit-countdown__label">Work Permit Countdown</div>
                        <div class="permit-countdown__value">${app.days_remaining} days remaining</div>
                    </div>
                    <div class="risk-indicator risk-indicator--${app.risk_level}">
                        <span class="risk-indicator__icon">${this.getRiskIcon(app.risk_level)}</span>
                        ${this.getRiskLabel(app.risk_level)}
                    </div>
                </div>

                ${app.ns_graduate ? `
                <div class="app-card__badge" style="display:inline-block; margin-top: 1rem; margin-right: 0.5rem; padding: 4px 10px; background: var(--accent-blue-alpha); color: var(--accent-blue); border-radius: 20px; font-size: 11px; font-weight: 600;">
                    🎓 Nova Scotia Graduate
                </div>
                ` : ''}

                ${app.has_case_number ? `
                <div class="app-card__badge" style="display:inline-block; margin-top: 1rem; margin-right: 0.5rem; padding: 4px 10px; background: var(--warning-bg); color: var(--warning); border-radius: 20px; font-size: 11px; font-weight: 600;">
                    📁 Case Num: ${app.case_number_date ? this.formatDate(app.case_number_date) : 'Yes'}
                </div>
                ` : ''}

                ${app.status_note ? `
                <div class="app-card__note" style="margin-top: 1rem; padding: 12px; background: var(--bg-tertiary); border-left: 3px solid var(--accent-blue); border-radius: 4px; font-size: 13px; color: var(--text-secondary); font-style: italic;">
                    "${app.status_note}"
                </div>
                ` : ''}

                <div class="app-card__actions">
                    <button class="btn btn--secondary btn--sm" onclick="app.editApplication(${app.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                    </button>
                    <button class="btn btn--danger btn--sm" onclick="app.deleteApplication(${app.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Delete
                    </button>
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

    // ===== STAT CARDS =====
    renderStatCards(stats) {
        return `
            <div class="stat-card">
                <div class="stat-card__label">Total Applicants</div>
                <div class="stat-card__value">${stats.total_applicants}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Avg. Waiting Time</div>
                <div class="stat-card__value">${stats.avg_waiting_months}<span class="stat-card__suffix">months</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Longest Waiting</div>
                <div class="stat-card__value">${stats.max_waiting_months}<span class="stat-card__suffix">months</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Shortest Waiting</div>
                <div class="stat-card__value">${stats.min_waiting_months}<span class="stat-card__suffix">months</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">% Nominated</div>
                <div class="stat-card__value">${stats.pct_nominated}%</div>
            </div>
        `;
    },

    // ===== TABLE RENDERING =====
    renderTableRows(rows) {
        if (!rows || rows.length === 0) {
            return `<tr><td colspan="8" style="text-align: center; padding: var(--space-10); color: var(--text-muted);">No matching applications found</td></tr>`;
        }

        return rows.map(row => `
            <tr>
                <td>${row.program_type}</td>
                <td style="font-size: var(--fs-xs)">${row.stream}</td>
                <td class="cell-mono">${row.noc_code}</td>
                <td>${this.formatDate(row.submission_date)}</td>
                <td>
                    <span class="cell-status status-badge--${row.status.toLowerCase()}">${row.status}</span>
                </td>
                <td class="cell-mono">${row.waiting_months} mo</td>
                <td class="cell-mono">${row.days_remaining}d</td>
                <td>
                    <span class="cell-risk cell-risk--${row.risk_level}">
                        ${this.getRiskIcon(row.risk_level)} ${this.getRiskLabel(row.risk_level)}
                    </span>
                </td>
                <td style="text-align: center;">${row.ns_graduate ? '🎓 Yes' : 'No'}</td>
                <td style="text-align: center; font-size: var(--fs-xs);">
                    ${row.has_case_number ? (row.case_number_date ? this.formatDate(row.case_number_date) : 'Yes') : '<span style="color: var(--text-muted); opacity: 0.5;">—</span>'}
                </td>
                <td style="max-width: 200px; font-style: italic; font-size: 12px; color: var(--text-secondary);">
                    ${row.status_note || '<span style="color: var(--text-muted); opacity: 0.5;">—</span>'}
                </td>
            </tr>
        `).join('');
    },

    renderPagination(pagination, onPageChange) {
        const { page, totalPages } = pagination;
        if (totalPages <= 1) return '';

        let buttons = '';

        // Simple pagination logic
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
                buttons += `
                    <button class="table-pagination__btn ${i === page ? 'table-pagination__btn--active' : ''}" 
                            onclick="window.handlePageChange(${i})">${i}</button>
                `;
            } else if (i === page - 3 || i === page + 3) {
                buttons += `<span style="color: var(--text-muted)">...</span>`;
            }
        }

        return `
            <div class="table-pagination__info">
                Showing page <strong>${page}</strong> of <strong>${totalPages}</strong> (${pagination.total} total)
            </div>
            <div class="table-pagination__controls">
                <button class="table-pagination__btn" ${page === 1 ? 'disabled' : ''} onclick="window.handlePageChange(${page - 1})">Prev</button>
                ${buttons}
                <button class="table-pagination__btn" ${page === totalPages ? 'disabled' : ''} onclick="window.handlePageChange(${page + 1})">Next</button>
            </div>
        `;
    },

    formatDate(dateStr) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    },

    // ===== ADMIN UI =====
    renderAdminStats(stats) {
        return `
            <div class="stat-card">
                <div class="stat-card__label">Users</div>
                <div class="stat-card__value">${stats.totalUsers}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Applications</div>
                <div class="stat-card__value">${stats.totalApplications}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Avg. Wait</div>
                <div class="stat-card__value">${stats.avgWaitingMonths}m</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Nominated</div>
                <div class="stat-card__value">${stats.nominatedApplications}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__label">Critical Risk</div>
                <div class="stat-card__value" style="color: var(--danger)">${stats.criticalRisk}</div>
            </div>
        `;
    }
};
