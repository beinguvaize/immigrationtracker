/**
 * Static data for NS PNP and AIP streams and NOC codes.
 */
const APP_DATA = {
    streams: {
        'NS PNP': [
            'Skilled Worker',
            'Express Entry',
            'International Graduate in Demand',
            'Physician',
            'Entrepreneur',
            'International Graduate Entrepreneur',
            'Labour Market Priorities',
            'Occupations in Demand'
        ],
        'AIP': [
            'Atlantic International Graduate Program',
            'Atlantic High-Skilled Program',
            'Atlantic Intermediate-Skilled Program'
        ]
    },

    statuses: ['Submitted', 'Selected for EOI', 'Nominated', 'Refused'],

    riskLabels: {
        green: { label: 'Safe', icon: '<i class="fa-solid fa-circle-check"></i>', desc: '> 120 days remaining' },
        yellow: { label: 'Caution', icon: '<i class="fa-solid fa-triangle-exclamation"></i>', desc: '60–120 days remaining' },
        red: { label: 'Critical', icon: '<i class="fa-solid fa-circle-exclamation"></i>', desc: '< 60 days remaining' },
        expired: { label: 'Expired', icon: '<i class="fa-solid fa-circle-xmark"></i>', desc: 'Work permit expired' }
    },

    statusColors: {
        'Submitted': '#3b82f6',
        'Selected for EOI': '#f59e0b',
        'Nominated': '#22c55e',
        'Endorsed': '#22c55e',
        'Refused': '#ef4444'
    }
};

// Also export as global convenient constants for main.js and admin.js
window.APP_DATA = APP_DATA;
window.STREAMS = APP_DATA.streams;
window.STATUSES = APP_DATA.statuses;
window.RISK_LABELS = APP_DATA.riskLabels;
window.STATUS_COLORS = APP_DATA.statusColors;
