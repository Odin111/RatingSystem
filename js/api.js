import { appState } from './state.js';

export const API = {
    async fetchAll() {
        try {
            const res = await fetch('/api/data');
            const data = await res.json();
            appState.existingUsers = data.users || [];
            appState.allApplicants = data.applicants || [];
            appState.allRatings = data.ratings || [];
            appState.allBatches = data.batches || [];
            appState.deletedApplicants = data.history_applicants || [];
            appState.deletedRatings = data.history_ratings || [];
            return data;
        } catch (err) {
            console.error('Failed to fetch data', err);
            return null;
        }
    },
    async saveBatch(batch) {
        await fetch('/api/batches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch)
        });
        await this.fetchAll();
    },
    async deleteBatch(id) {
        await fetch(`/api/batches/${id}`, { method: 'DELETE' });
        await this.fetchAll();
    },
    async renameBatch(id, name) {
        await fetch(`/api/batches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        await this.fetchAll();
    },
    async deleteBatchAllAndFolder(id) {
        await fetch(`/api/batches/${id}/delete-all-and-folder`, { method: 'DELETE' });
        await this.fetchAll();
    },
    async deleteHistoryFolder(folderName) {
        await fetch(`/api/history-folder/${encodeURIComponent(folderName)}`, { method: 'DELETE' });
        await this.fetchAll();
    },
    async restoreFolder(folderName) {
        await fetch('/api/restore-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderName })
        });
        await this.fetchAll();
    },
    async saveUser(user) {
        await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        await this.fetchAll();
    },
    async deleteUser(username) {
        await fetch(`/api/users/${username}`, { method: 'DELETE' });
        await this.fetchAll();
    },
    async saveApplicant(applicant, oldKeys = {}) {
        const payload = { ...applicant };
        if (oldKeys.name) payload.oldName = oldKeys.name;
        if (oldKeys.position) payload.oldPosition = oldKeys.position;
        
        await fetch('/api/applicants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await this.fetchAll();
    },
    async deleteAllApplicants(batch) {
        const url = batch ? `/api/applicants/delete-all?batch=${encodeURIComponent(batch)}` : '/api/applicants/delete-all';
        await fetch(url, { method: 'DELETE' });
        await this.fetchAll();
    },
    async deleteApplicant(name, position) {
        await fetch('/api/applicants', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, position })
        });
        await this.fetchAll();
    },
    async deleteApplicantsBulk(applicants) {
        await fetch('/api/applicants/delete-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicants })
        });
        await this.fetchAll();
    },
    async moveApplicantsBulk(applicants, batchId) {
        await fetch('/api/applicants/move-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicants, batchId })
        });
        await this.fetchAll();
    },
    async saveRatings(ratings) {
        await fetch('/api/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ratings)
        });
        await this.fetchAll();
    },
    async deleteRating(id) {
        await fetch(`/api/ratings/${id}`, { method: 'DELETE' });
        await this.fetchAll();
    },
    async restore(type, payload) {
        await fetch(`/api/restore/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await this.fetchAll();
    },
    async restoreBulk(type, ids) {
        await fetch(`/api/restore-bulk/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        await this.fetchAll();
    },
    async restoreAll(type, payload = {}) {
        await fetch(`/api/restore-all/${type}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await this.fetchAll();
    },
    async deleteAllRatings() {
        const res = await fetch('/api/ratings/delete-all', { method: 'DELETE' });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete ratings');
        }
        await this.fetchAll();
    },
    async clearAll() {
        await fetch('/api/clear-all', { method: 'DELETE' });
        await this.fetchAll();
    },
    async clearHistory(type) {
        await fetch(`/api/clear-history/${type}`, { method: 'DELETE' });
        await this.fetchAll();
    },
    async deleteHistoryRating(id) {
        await fetch(`/api/history/rating/${id}`, { method: 'DELETE' });
        await this.fetchAll();
    },
    async deleteHistoryBulk(ids) {
        await fetch('/api/history/delete-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        await this.fetchAll();
    },
    async deleteHistoryApplicant(name, position) {
        await fetch('/api/history-applicant', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, position })
        });
        await this.fetchAll();
    },
    async migrate(data) {
        await fetch('/api/migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await this.fetchAll();
    },
    async syncCredentials(name, credentials) {
        await fetch('/api/applicants/sync-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, credentials })
        });
        await this.fetchAll();
    },
    async syncDivision(name, division) {
        await fetch('/api/applicants/sync-division', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, division })
        });
        await this.fetchAll();
    },
    async updateDateOfApplication(rater, dateOfApplication) {
        await fetch('/api/ratings/update-date-of-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rater, dateOfApplication })
        });
        await this.fetchAll();
    }
};
