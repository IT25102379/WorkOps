import { WorkOps } from '../main.js';
import { AttendanceModel } from '../models/attendance-model.js';
import { AttendanceView } from '../views/attendance-view.js';

class AttendanceController {
    constructor() {
        this.model = new AttendanceModel();
        this.view = new AttendanceView();
        this.timerInterval = null;
        this.init();
    }

    async init() {
        this.startRealtimeClock();
        this.initGeolocation();
        this.bindEvents();
        try {
            await Promise.all([this.refreshTodayStatus(), this.refreshKpis(), this.refreshRecords(), this.refreshCorrections()]);
        } catch (error) {
            console.error('Error loading attendance module data:', error);
        }
    }

    startRealtimeClock() {
        const time = document.getElementById('digital-clock-time');
        const date = document.getElementById('digital-clock-date');
        const update = () => {
            const now = new Date();
            if (time) time.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            if (date) date.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        };
        update();
        setInterval(update, 1000);
    }

    initGeolocation() {
        if (!('geolocation' in navigator)) {
            this.view.showGeolocationUnavailable();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => {
                this.model.setCoordinates(position.coords.latitude, position.coords.longitude);
                this.view.showCoordinates(this.model.currentCoords);
                const status = document.getElementById('geo-status-text');
                if (status) status.innerHTML = '<span class="text-success"><i class="fa-solid fa-satellite-dish me-1"></i> GPS Geofence Verified</span>';
            },
            error => {
                console.warn('[Geolocation] Precision lookup bypassed:', error.message);
                this.view.showGeolocationFallback();
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }

    async refreshTodayStatus() {
        const status = await this.model.loadTodayStatus();
        if (status) this.view.renderClock(status, this.timerInterval, value => { this.timerInterval = value; });
    }

    async refreshKpis() {
        const kpis = await this.model.loadKpis();
        this.view.updateKpis(kpis, (id, value, suffix) => this.animateCounter(id, value, suffix));
    }

    async refreshRecords(filters = {}) {
        this.view.showLoadingRecords();
        const records = await this.model.loadRecords(filters);
        this.view.renderRecords(records, status => this.getStatusBadgeHTML(status), id => this.showRecord(id));
    }

    async refreshCorrections() {
        const corrections = await this.model.loadCorrections();
        this.view.renderCorrections(corrections, (id, status) => this.handleReviewCorrection(id, status));
    }

    showRecord(id) {
        const record = this.model.records.find(item => item.id === id);
        if (record) this.view.showAuditDetails(record);
    }

    animateCounter(id, targetValue, suffix = '') {
        const element = document.getElementById(id);
        if (!element) return;
        let current = 0;
        const step = targetValue / 20;
        const decimal = String(targetValue).includes('.');
        const timer = setInterval(() => {
            current += step;
            if (current >= targetValue) {
                element.textContent = (decimal ? targetValue.toFixed(1) : Math.round(targetValue)) + suffix;
                clearInterval(timer);
            } else element.textContent = (decimal ? current.toFixed(1) : Math.round(current)) + suffix;
        }, 25);
    }

    getStatusBadgeHTML(status) {
        const badges = {
            PRESENT: '<span class="badge bg-success">Present</span>',
            LATE_ARRIVAL: '<span class="badge bg-warning text-dark">Late Arrival</span>',
            OVERTIME: '<span class="badge bg-info text-dark">Overtime</span>',
            HALF_DAY: '<span class="badge bg-secondary">Half Day</span>',
            EARLY_DEPARTURE: '<span class="badge bg-danger">Early Leave</span>',
            ABSENT: '<span class="badge bg-danger">Absent</span>'
        };
        return badges[status] || `<span class="badge bg-secondary">${status || 'Unknown'}</span>`;
    }

    bindEvents() {
        this.view.getClockButton()?.addEventListener('click', () => this.handleClockAction());
        document.getElementById('btn-apply-filters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('btn-reset-filters')?.addEventListener('click', () => { this.view.resetFilters(); this.refreshRecords(); });
        document.getElementById('filter-search')?.addEventListener('input', event => {
            const term = event.target.value.toLowerCase();
            const records = this.model.records.filter(record => (record.employeeName || '').toLowerCase().includes(term) || (record.employeeCode || '').toLowerCase().includes(term));
            this.view.renderRecords(records, status => this.getStatusBadgeHTML(status), id => this.showRecord(id));
        });
        document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('correction-request-form')?.addEventListener('submit', event => this.handleCorrectionSubmit(event));
    }

    async handleClockAction() {
        this.view.setClockProcessing(true);
        try {
            const active = this.model.todayStatus?.isClockedIn && !this.model.todayStatus?.isClockedOut;
            const response = active ? await this.model.clockOut('Shift completed via Web Dashboard') : await this.model.clockIn('Clocked in via WorkOps Web Dashboard');
            if (response?.success) WorkOps.showToast('success', active ? 'Clock-Out successful! Shift duration recorded.' : 'Clock-In successful! Have a productive shift.', active ? 'Goodbye' : 'Welcome');
            await Promise.all([this.refreshTodayStatus(), this.refreshKpis(), this.refreshRecords()]);
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Operation failed. Please try again.', 'Clock Action Error');
            if (this.model.todayStatus) this.view.renderClock(this.model.todayStatus, this.timerInterval, value => { this.timerInterval = value; });
        }
    }

    applyFilters() {
        const filters = Object.fromEntries(Object.entries(this.view.getFilterValues()).filter(([, value]) => value));
        this.refreshRecords(filters);
    }

    async handleCorrectionSubmit(event) {
        event.preventDefault();
        const payload = this.view.getCorrectionFormValues();
        if (!payload.requestedDate || !payload.reason) {
            WorkOps.showToast('warning', 'Please fill in required fields: Date and Reason.');
            return;
        }
        try {
            const response = await this.model.submitCorrection(payload);
            if (response?.success) {
                WorkOps.showToast('success', 'Correction request submitted to HR/Manager for review.');
                bootstrap.Modal.getInstance(document.getElementById('correctionModal'))?.hide();
                this.view.resetCorrectionForm();
                await this.refreshCorrections();
            }
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Failed to submit correction request');
        }
    }

    async handleReviewCorrection(id, status) {
        try {
            const response = await this.model.reviewCorrection(id, status);
            if (response?.success) {
                WorkOps.showToast('success', `Correction request #${id} marked as ${status}`);
                await Promise.all([this.refreshCorrections(), this.refreshKpis(), this.refreshRecords()]);
            }
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Failed to review correction');
        }
    }

    exportToCSV() {
        if (!this.model.records.length) {
            WorkOps.showToast('warning', 'No records available to export.');
            return;
        }
        const headers = ['Employee Code', 'Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Late (Mins)', 'Overtime (Mins)', 'Status', 'Geofence'];
        const rows = this.model.records.map(record => [record.employeeCode, record.employeeName, record.departmentName, record.attendanceDate, record.clockInTime, record.clockOutTime, `${record.workDurationMinutes || 0} mins`, record.lateMinutes || 0, record.overtimeMinutes || 0, record.status, record.isGeofenceVerified ? 'YES' : 'NO'].map(value => `"${value || ''}"`).join(','));
        const link = document.createElement('a');
        link.href = encodeURI(`data:text/csv;charset=utf-8,${[headers.join(','), ...rows].join('\n')}`);
        link.download = `workops_attendance_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        WorkOps.showToast('success', 'Attendance CSV file exported successfully.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.attendanceModule = new AttendanceController();
});
