/**
 * Chart.js chart instances for the aggregate panel.
 */
window.charts = {
    waitingChart: null,
    statusChart: null,
    riskChart: null,

    chartDefaults() {
        if (typeof Chart === 'undefined') return {};
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 12 },
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    titleFont: { family: 'Inter', weight: '600' },
                    bodyFont: { family: 'Inter' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    border: { color: 'rgba(255, 255, 255, 0.06)' }
                },
                y: {
                    ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    border: { color: 'rgba(255, 255, 255, 0.06)' }
                }
            }
        };
    },

    renderWaitingChart(data) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('waitingChart');
        if (!ctx) return;

        if (this.waitingChart) this.waitingChart.destroy();

        const bucketOrder = ['0-3', '3-6', '6-9', '9-12', '12-18', '18+'];
        const labels = bucketOrder.map(b => b + ' mo');
        const values = bucketOrder.map(b => {
            const item = data.find(d => d.bucket === b);
            return item ? item.count : 0;
        });

        const defaults = this.chartDefaults();

        this.waitingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Applicants',
                    data: values,
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(147, 51, 234, 0.7)',
                        'rgba(236, 72, 153, 0.7)'
                    ],
                    borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(147, 51, 234, 1)',
                        'rgba(236, 72, 153, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                ...defaults,
                plugins: {
                    ...defaults.plugins,
                    legend: { display: false }
                }
            }
        });
    },

    renderStatusChart(data) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        if (this.statusChart) this.statusChart.destroy();

        const labels = data.map(d => d.status);
        const values = data.map(d => d.count);
        const colors = labels.map(s => (typeof APP_DATA !== 'undefined' ? APP_DATA.statusColors[s] : '#64748b'));

        this.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.map(c => c + 'cc'),
                    borderColor: colors,
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12 },
                            padding: 16,
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    },
                    tooltip: this.chartDefaults().plugins.tooltip
                }
            }
        });
    },

    renderRiskChart(data) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('riskChart');
        if (!ctx) return;

        if (this.riskChart) this.riskChart.destroy();

        const riskOrder = ['green', 'yellow', 'red', 'expired'];
        const riskLabels = { green: 'Safe (>120d)', yellow: 'Caution (60-120d)', red: 'Critical (<60d)', expired: 'Expired' };
        const riskColors = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', expired: '#9333ea' };

        const labels = riskOrder.map(r => riskLabels[r]);
        const values = riskOrder.map(r => {
            const item = data.find(d => d.risk_level === r);
            return item ? item.count : 0;
        });
        const bgColors = riskOrder.map(r => riskColors[r] + 'aa');
        const bdColors = riskOrder.map(r => riskColors[r]);

        const defaults = this.chartDefaults();

        this.riskChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Applicants',
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: bdColors,
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                ...defaults,
                indexAxis: 'y',
                plugins: {
                    ...defaults.plugins,
                    legend: { display: false }
                }
            }
        });
    },

    renderAll(statsData) {
        this.renderWaitingChart(statsData.waitingDistribution || []);
        this.renderStatusChart(statsData.statusDistribution || []);
        this.renderRiskChart(statsData.riskDistribution || []);
    },

    updateCharts(statsData) {
        this.renderAll(statsData);
    }
};
