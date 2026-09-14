import { ApiClient } from '../api.js';

export class AttendanceModel {
    constructor() {
        this.currentCoords = { latitude: 6.927079, longitude: 79.861244 };
        this.todayStatus = null;
        this.records = [];
        this.corrections = [];
    }

    setCoordinates(latitude, longitude) {
        this.currentCoords = { latitude, longitude };
    }

    async loadTodayStatus() {
        const response = await ApiClient.get('/attendance/status/today');
        if (response?.success && response.data) this.todayStatus = response.data;
        return this.todayStatus;
    }

    async loadKpis() {
        const response = await ApiClient.get('/attendance/kpis');
        return response?.success ? response.data : null;
    }

    async loadRecords(filters = {}) {
        const response = await ApiClient.get('/attendance/records', filters);
        this.records = response?.success && response.data ? response.data : [];
        return this.records;
    }

    async loadCorrections() {
        const response = await ApiClient.get('/attendance/corrections');
        this.corrections = response?.success && response.data ? response.data : [];
        return this.corrections;
    }

    async clockIn(remarks) {
        return ApiClient.post('/attendance/clock-in', {
            ...this.currentCoords,
            remarks
        });
    }

    async clockOut(remarks) {
        return ApiClient.post('/attendance/clock-out', {
            ...this.currentCoords,
            remarks
        });
    }

    async submitCorrection(payload) {
        return ApiClient.post('/attendance/corrections', payload);
    }

    async reviewCorrection(id, status) {
        return ApiClient.put(`/attendance/corrections/${id}/review`, {
            status,
            reviewComment: status === 'APPROVED'
                ? 'Correction verified and approved by manager'
                : 'Correction rejected due to insufficient audit logs'
        });
    }
}
