const API_BASE = '/api';

const api = {
    // Auth
    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    },

    async register(email, password) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getToken() { return localStorage.getItem('token'); },
    setToken(token) { localStorage.setItem('token', token); },
    getUser() { return JSON.parse(localStorage.getItem('user') || 'null'); },
    setUser(user) { localStorage.setItem('user', JSON.stringify(user)); },

    getHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    // Applications (User)
    async getMyApplications() {
        const res = await fetch(`${API_BASE}/applications`, { headers: this.getHeaders() });
        if (res.status === 401 || res.status === 403) { this.logout(); window.location.reload(); }
        return await res.json();
    },

    async createApplication(appData) {
        const res = await fetch(`${API_BASE}/applications`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(appData)
        });
        return await res.json();
    },

    async updateApplication(id, appData) {
        const res = await fetch(`${API_BASE}/applications/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(appData)
        });
        return await res.json();
    },

    async deleteApplication(id) {
        const res = await fetch(`${API_BASE}/applications/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete application');
        return data;
    },

    // Stats (Public/Anonymized)
    async getAggregatedStats(filters = {}) {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/stats?${params}`);
        return await res.json();
    },

    async getStatsTable(params = {}) {
        const searchParams = new URLSearchParams(params);
        const res = await fetch(`${API_BASE}/stats/table?${searchParams}`);
        return await res.json();
    },

    async getActivityFeed() {
        const res = await fetch(`${API_BASE}/stats/activity-feed`);
        return await res.json();
    },

    async getNOCStats(code) {
        const res = await fetch(`${API_BASE}/stats/noc/${code}`);
        return await res.json();
    },

    async getInsights() {
        const res = await fetch(`${API_BASE}/stats/insights`);
        return await res.json();
    },

    // Admin
    async getAdminDashboard() {
        const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: this.getHeaders() });
        return await res.json();
    },

    async getAdminUsers(params = {}) {
        const searchParams = new URLSearchParams(params);
        const res = await fetch(`${API_BASE}/admin/users?${searchParams}`, { headers: this.getHeaders() });
        return await res.json();
    },

    async updateAdminUserRole(id, role) {
        const res = await fetch(`${API_BASE}/admin/users/${id}/role`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ role })
        });
        return await res.json();
    },

    async deleteAdminUser(id) {
        const res = await fetch(`${API_BASE}/admin/users/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return await res.json();
    },

    async getAdminApplications(params = {}) {
        const searchParams = new URLSearchParams(params);
        const res = await fetch(`${API_BASE}/admin/applications?${searchParams}`, { headers: this.getHeaders() });
        return await res.json();
    },

    async updateAdminApplication(id, appData) {
        const res = await fetch(`${API_BASE}/admin/applications/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(appData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update application');
        return data;
    },

    async bulkUpdateAdminStatus(appIds, status) {
        const res = await fetch(`${API_BASE}/admin/applications/bulk-status`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ appIds, status })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to bulk update status');
        return data;
    },

    async deleteAdminApplication(id) {
        const res = await fetch(`${API_BASE}/admin/applications/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete application');
        return data;
    },

    // Announcements
    async getActiveAnnouncement() {
        const res = await fetch(`${API_BASE}/stats/announcements/active`);
        return await res.json();
    },

    async getAdminAnnouncements() {
        const res = await fetch(`${API_BASE}/admin/announcements`, { headers: this.getHeaders() });
        return await res.json();
    },

    async createAdminAnnouncement(message) {
        const res = await fetch(`${API_BASE}/admin/announcements`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ message, active: 1 })
        });
        return await res.json();
    },

    async toggleAdminAnnouncement(id, active) {
        const res = await fetch(`${API_BASE}/admin/announcements/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ active })
        });
        return await res.json();
    },

    async deleteAdminAnnouncement(id) {
        const res = await fetch(`${API_BASE}/admin/announcements/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return await res.json();
    }
};
