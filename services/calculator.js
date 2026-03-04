/**
 * Core calculation engine for waiting times and risk levels.
 */

function calculateWaitingTime(submissionDateStr, status, nominatedDateStr) {
    const submission = new Date(submissionDateStr);
    // If nominated/endorsed/refused, stop counter at that date (or now if no nominated_date)
    const endDate = (status === 'Nominated' || status === 'Endorsed' || status === 'Refused')
        ? (nominatedDateStr ? new Date(nominatedDateStr) : new Date())
        : new Date();

    const diffMs = endDate - submission;
    if (diffMs < 0) return { years: 0, months: 0, days: 0, totalMonths: 0 };

    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const totalMonths = parseFloat((totalDays / 30.44).toFixed(1)); // average days per month

    // Calculate years, months, days breakdown
    let years = endDate.getFullYear() - submission.getFullYear();
    let months = endDate.getMonth() - submission.getMonth();
    let days = endDate.getDate() - submission.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months, days, totalMonths, totalDays };
}

function calculateWorkPermitCountdown(expiryDateStr) {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diffMs = expiry - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const riskLevel = getRiskLevel(daysRemaining);

    return { daysRemaining, riskLevel };
}

function getRiskLevel(daysRemaining) {
    if (daysRemaining < 0) return 'expired';
    if (daysRemaining <= 60) return 'red';
    if (daysRemaining <= 120) return 'yellow';
    return 'green';
}

module.exports = { calculateWaitingTime, calculateWorkPermitCountdown, getRiskLevel };
