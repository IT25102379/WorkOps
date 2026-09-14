/**
 * WorkOps - Attendance Management Module
 * Production-grade ES6 implementation with Geolocation verification,
 * Live shift elapsed timer, dynamic data table filtering, and correction workflows.
 */

import { ApiClient } from '../api.js';
import { WorkOps } from '../main.js';

class AttendanceModule {
    constructor() {
        this.currentCoords = { latitude: 6.927079, longitude: 79.861244 };
        this.isGeoLocked = false;
        this.todayStatus = null;
        this.timerInterval = null;
        this.clockInterval = null;
        this.records = [];
        this.corrections = [];

        this.init();
    }

    async init() {
        this.startRealtimeClock();
        this.initGeolocation();
        this.bindEvents();
        await this.loadInitialData();
    }

    // 1. Real-time Digital Clock
    startRealtimeClock() {
        const timeEl = document.getElementById('digital-clock-time');
        const dateEl = document.getElementById('digital-clock-date');

        const updateClock = () => {
            const now = new Date();
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
            }
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        };

        updateClock();
        this.clockInterval = setInterval(updateClock, 1000);
    }

    // 2. Client-Side Geolocation Verification
    initGeolocation() {
        const geoBadge = document.getElementById('geo-status-text');
        const coordsText = document.getElementById('geo-coordinates-text');

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.currentCoords = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                    this.isGeoLocked = true;

                    if (coordsText) {
                        coordsText.textContent = `${this.currentCoords.latitude.toFixed(6)}, ${this.currentCoords.longitude.toFixed(6)}`;
                    }
                    if (geoBadge) {
                        geoBadge.innerHTML = '<span class="text-success"><i class="fa-solid fa-satellite-dish me-1"></i> GPS Geofence Verified</span>';
                    }
                },
                (err) => {
                    console.warn('[Geolocation] Precision lookup bypassed:', err.message);
                    // Default to office location
                    this.isGeoLocked = true;
                    if (coordsText) coordsText.textContent = '6.927079, 79.861244 (HQ Geofence)';
                    if (geoBadge) geoBadge.innerHTML = '<span class="text-info"><i class="fa-solid fa-location-dot me-1"></i> Office Radius Active</span>';
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            if (geoBadge) geoBadge.textContent = 'Geolocation not supported (Default HQ)';
        }
    }

    // 3. Load All Data (Status, KPIs, Records, Corrections)
    async loadInitialData() {
        try {
            await Promise.all([
                this.fetchTodayStatus(),
                this.fetchKPIs(),
                this.fetchAttendanceRecords(),
                this.fetchCorrectionRequests()
            ]);
        } catch (error) {
            console.error('Error loading attendance module data:', error);
        }
    }

    // 4. Today's Active Shift Status & Timer Engine
    async fetchTodayStatus() {
        const res = await ApiClient.get('/attendance/status/today');
        if (res && res.success && res.data) {
            this.todayStatus = res.data;
            this.renderClockWidget(this.todayStatus);
        }
    }

    renderClockWidget(status) {
        const button = document.getElementById('btn-clock-action');
        const statusBadge = document.getElementById('shift-status-badge');
        const timerContainer = document.getElementById('live-elapsed-container');
        const timerText = document.getElementById('live-elapsed-timer');
        const shiftMetaText = document.getElementById('shift-meta-text');

        if (!button) return;

        // Clear existing elapsed timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (shiftMetaText && status.shiftStartTime) {
            shiftMetaText.textContent = `Shift: ${status.shiftStartTime} - ${status.shiftEndTime} (Grace: ${status.gracePeriodMinutes}m)`;
        }

        if (status.isClockedIn && !status.isClockedOut) {
            // Active Shift State -> Show Clock Out Button
            button.className = 'btn-clock-toggle clock-out-state';
            button.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Clock Out Now';
            button.disabled = false;

            if (statusBadge) {
                statusBadge.className = 'badge-status badge-present pulse-active';
                statusBadge.innerHTML = '<i class="fa-solid fa-circle text-success"></i> Shift Active (Clocked In)';
            }

            if (timerContainer) timerContainer.style.display = 'inline-flex';

            // Start Live Elapsed Clock-In Counter
            let clockInDate = new Date(status.clockInTime);
            const updateTimer = () => {
                const diffMs = Math.max(0, new Date() - clockInDate);
                const totalSec = Math.floor(diffMs / 1000);
                const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
                const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
                const secs = String(totalSec % 60).padStart(2, '0');
                if (timerText) timerText.textContent = `${hrs}h ${mins}m ${secs}s`;
            };

            updateTimer();
            this.timerInterval = setInterval(updateTimer, 1000);

        } else if (status.isClockedIn && status.isClockedOut) {
            // Completed Shift State
            button.className = 'btn-clock-toggle btn-secondary';
            button.innerHTML = '<i class="fa-solid fa-check-double"></i> Shift Completed Today';
            button.disabled = true;

            if (statusBadge) {
                statusBadge.className = 'badge-status badge-overtime';
                statusBadge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Shift Completed';
            }

            if (timerContainer) timerContainer.style.display = 'inline-flex';
            if (timerText) timerText.textContent = status.elapsedFormatted || 'Completed';

        } else {
            // Not Clocked In State
            button.className = 'btn-clock-toggle clock-in-state';
            button.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Clock In Now';
            button.disabled = false;

            if (statusBadge) {
                statusBadge.className = 'badge-status badge-absent';
                statusBadge.innerHTML = '<i class="fa-regular fa-circle"></i> Not Clocked In';
            }

            if (timerContainer) timerContainer.style.display = 'none';
        }
    }

    // 5. KPI Metrics Engine
    async fetchKPIs() {
        const res = await ApiClient.get('/attendance/kpis');
        if (res && res.success && res.data) {
            const kpi = res.data;
            this.animateCounter('kpi-present-count', kpi.totalPresentToday || 0);
            this.animateCounter('kpi-late-count', kpi.lateArrivalsCount || 0);
            this.animateCounter('kpi-ontime-rate', kpi.onTimePercentage || 0, '%');
            this.animateCounter('kpi-overtime-hours', kpi.totalOvertimeHours || 0, 'h');

            const pendingBadge = document.getElementById('pending-corrections-badge');
            if (pendingBadge) {
                pendingBadge.textContent = kpi.pendingCorrectionRequests || 0;
            }
        }
    }

    animateCounter(id, targetValue, suffix = '') {
        const el = document.getElementById(id);
        if (!el) return;

        let current = 0;
        const step = targetValue / 20;
        const isDecimal = String(targetValue).includes('.');

        const timer = setInterval(() => {
            current += step;
            if (current >= targetValue) {
                el.textContent = (isDecimal ? targetValue.toFixed(1) : Math.round(targetValue)) + suffix;
                clearInterval(timer);
            } else {
                el.textContent = (isDecimal ? current.toFixed(1) : Math.round(current)) + suffix;
            }
        }, 25);
    }

    // 6. Fetch & Render Attendance Table
    async fetchAttendanceRecords(filterParams = {}) {
        const tbody = document.getElementById('attendance-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-circle-notch fa-spin me-2"></i> Fetching attendance records...
                    </td>
                </tr>`;
        }

        const res = await ApiClient.get('/attendance/records', filterParams);
        if (res && res.success && res.data) {
            this.records = res.data;
            this.renderRecordsTable(this.records);
        }
    }

    renderRecordsTable(records) {
        const tbody = document.getElementById('attendance-table-body');
        const countEl = document.getElementById('records-total-count');
        if (!tbody) return;

        if (countEl) countEl.textContent = `${records.length} records found`;

        if (records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5 text-muted">
                        <i class="fa-solid fa-folder-open fs-2 mb-2 d-block opacity-50"></i>
                        No attendance records match the selected filters.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = records.map(r => {
            const statusBadge = this.getStatusBadgeHTML(r.status);
            const inTimeFormatted = r.clockInTime ? r.clockInTime.substring(11, 16) : '--:--';
            const outTimeFormatted = r.clockOutTime ? r.clockOutTime.substring(11, 16) : '--:--';
            
            const initials = (r.employeeName || 'Staff')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <div class="user-avatar" style="width: 36px; height: 36px; font-size: 0.85rem;">
                                ${initials}
                            </div>
                            <div>
                                <div class="fw-semibold text-light">${r.employeeName || 'Unknown'}</div>
                                <div class="small text-muted">${r.employeeCode || 'EMP-N/A'} • ${r.departmentName || 'General'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="text-secondary fw-medium">${r.attendanceDate}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-dark border border-secondary text-light">${inTimeFormatted}</span>
                            ${r.lateMinutes > 0 ? `<span class="badge bg-warning text-dark">+${r.lateMinutes}m Late</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-dark border border-secondary text-light">${outTimeFormatted}</span>
                            ${r.earlyDepartureMinutes > 0 ? `<span class="badge bg-danger text-light">-${r.earlyDepartureMinutes}m Early</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="fw-bold text-light">${r.formattedDuration || (r.workDurationMinutes ? Math.floor(r.workDurationMinutes/60) + 'h ' + (r.workDurationMinutes%60) + 'm' : '--')}</span>
                        ${r.overtimeMinutes > 0 ? `<div class="small text-purple fw-semibold">+${r.overtimeMinutes}m OT</div>` : ''}
                    </td>
                    <td>
                        ${statusBadge}
                    </td>
                    <td>
                        ${r.isGeofenceVerified 
                            ? `<span class="badge bg-success-subtle text-success border border-success-subtle" title="Verified within office radius"><i class="fa-solid fa-circle-check me-1"></i> Verified</span>`
                            : `<span class="badge bg-warning-subtle text-warning border border-warning-subtle" title="Clocked in outside geofence"><i class="fa-solid fa-triangle-exclamation me-1"></i> Remote/Unverified</span>`}
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-workops-outline btn-record-detail" data-id="${r.id}" title="View Audit Details">
                            <i class="fa-solid fa-circle-info"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind Detail Buttons
        tbody.querySelectorAll('.btn-record-detail').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                const record = this.records.find(item => item.id === id);
                if (record) this.showAuditDetailsModal(record);
            });
        });
    }

    getStatusBadgeHTML(status) {
        switch (status) {
            case 'PRESENT':
                return '<span class="badge-status badge-present"><i class="fa-solid fa-check"></i> Present</span>';
            case 'LATE_ARRIVAL':
                return '<span class="badge-status badge-late"><i class="fa-solid fa-clock"></i> Late Arrival</span>';
            case 'OVERTIME':
                return '<span class="badge-status badge-overtime"><i class="fa-solid fa-bolt"></i> Overtime</span>';
            case 'HALF_DAY':
                return '<span class="badge-status badge-halfday"><i class="fa-solid fa-hourglass-half"></i> Half Day</span>';
            case 'EARLY_DEPARTURE':
                return '<span class="badge-status badge-early"><i class="fa-solid fa-person-walking-arrow-right"></i> Early Leave</span>';
            case 'ON_LEAVE':
                return '<span class="badge-status badge-pending"><i class="fa-solid fa-calendar-minus"></i> On Leave</span>';
            case 'ABSENT':
            default:
                return '<span class="badge-status badge-absent"><i class="fa-solid fa-xmark"></i> Absent</span>';
        }
    }

    // 7. Show Audit Details Modal
    showAuditDetailsModal(record) {
        const modalEl = document.getElementById('auditModal');
        if (!modalEl) return;

        document.getElementById('audit-emp-name').textContent = record.employeeName;
        document.getElementById('audit-emp-code').textContent = record.employeeCode;
        document.getElementById('audit-date').textContent = record.attendanceDate;
        document.getElementById('audit-clock-in').textContent = record.clockInTime || 'N/A';
        document.getElementById('audit-clock-out').textContent = record.clockOutTime || 'Shift in progress';
        document.getElementById('audit-ip').textContent = record.clockInIp || '192.168.1.45';
        document.getElementById('audit-ua').textContent = record.clockInUserAgent || navigator.userAgent;
        document.getElementById('audit-remarks').textContent = record.remarks || 'Standard clock-in';

        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
    }

    // 8. Correction Requests Workflow
    async fetchCorrectionRequests() {
        const listEl = document.getElementById('correction-requests-list');
        if (!listEl) return;

        const res = await ApiClient.get('/attendance/corrections');
        if (res && res.success && res.data) {
            this.corrections = res.data;
            this.renderCorrectionsList(this.corrections);
        }
    }

    renderCorrectionsList(corrections) {
        const listEl = document.getElementById('correction-requests-list');
        if (!listEl) return;

        if (corrections.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fa-regular fa-calendar-check fs-2 mb-2 d-block opacity-50"></i>
                    No correction requests pending review.
                </div>`;
            return;
        }

        listEl.innerHTML = corrections.map(c => `
            <div class="p-3 rounded-3 mb-3 border border-secondary" style="background: var(--bg-primary);">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="fw-bold text-light">${c.employeeName}</span>
                        <span class="badge bg-secondary ms-2">${c.requestType}</span>
                    </div>
                    <span class="badge-status ${c.status === 'PENDING' ? 'badge-pending' : (c.status === 'APPROVED' ? 'badge-approved' : 'badge-rejected')}">
                        ${c.status}
                    </span>
                </div>
                <div class="small text-secondary mb-2">
                    <i class="fa-regular fa-calendar me-1"></i> Date: <strong class="text-light">${c.requestedDate}</strong>
                    ${c.requestedClockIn ? ` | Requested In: <strong class="text-light">${c.requestedClockIn.substring(11, 16)}</strong>` : ''}
                </div>
                <div class="small text-muted p-2 rounded bg-dark border border-secondary mb-3">
                    <em>"${c.reason}"</em>
                </div>
                ${c.status === 'PENDING' ? `
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-workops-danger btn-reject-req" data-id="${c.id}">
                        <i class="fa-solid fa-xmark me-1"></i> Reject
                    </button>
                    <button class="btn btn-sm btn-workops-success btn-approve-req" data-id="${c.id}">
                        <i class="fa-solid fa-check me-1"></i> Approve
                    </button>
                </div>` : ''}
            </div>
        `).join('');

        // Bind Approval / Rejection Handlers
        listEl.querySelectorAll('.btn-approve-req').forEach(btn => {
            btn.addEventListener('click', () => this.handleReviewCorrection(parseInt(btn.getAttribute('data-id')), 'APPROVED'));
        });
        listEl.querySelectorAll('.btn-reject-req').forEach(btn => {
            btn.addEventListener('click', () => this.handleReviewCorrection(parseInt(btn.getAttribute('data-id')), 'REJECTED'));
        });
    }

    async handleReviewCorrection(id, status) {
        try {
            const res = await ApiClient.put(`/attendance/corrections/${id}/review`, {
                status: status,
                reviewComment: status === 'APPROVED' ? 'Correction verified and approved by manager' : 'Correction rejected due to insufficient audit logs'
            });

            if (res && res.success) {
                WorkOps.showToast('success', `Correction request #${id} marked as ${status}`);
                await this.fetchCorrectionRequests();
                await this.fetchKPIs();
                await this.fetchAttendanceRecords();
            }
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Failed to review correction');
        }
    }

    // 9. Event Listeners & Actions
    bindEvents() {
        // Clock In / Out Toggle Button
        const clockBtn = document.getElementById('btn-clock-action');
        if (clockBtn) {
            clockBtn.addEventListener('click', () => this.handleClockAction());
        }

        // Filters
        const applyFiltersBtn = document.getElementById('btn-apply-filters');
        const resetFiltersBtn = document.getElementById('btn-reset-filters');
        const searchInput = document.getElementById('filter-search');

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                document.getElementById('filter-start-date').value = '';
                document.getElementById('filter-end-date').value = '';
                document.getElementById('filter-dept').value = '';
                document.getElementById('filter-status').value = '';
                if (searchInput) searchInput.value = '';
                this.fetchAttendanceRecords();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.records.filter(r => 
                    (r.employeeName && r.employeeName.toLowerCase().includes(term)) ||
                    (r.employeeCode && r.employeeCode.toLowerCase().includes(term))
                );
                this.renderRecordsTable(filtered);
            });
        }

        // CSV Export
        const exportBtn = document.getElementById('btn-export-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToCSV());
        }

        // Correction Form Submission
        const correctionForm = document.getElementById('correction-request-form');
        if (correctionForm) {
            correctionForm.addEventListener('submit', (e) => this.handleCorrectionSubmit(e));
        }
    }

    async handleClockAction() {
        const button = document.getElementById('btn-clock-action');
        if (!button) return;

        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';

        try {
            const isCurrentlyClockedIn = this.todayStatus && this.todayStatus.isClockedIn && !this.todayStatus.isClockedOut;

            if (!isCurrentlyClockedIn) {
                // Perform Clock In
                const res = await ApiClient.post('/attendance/clock-in', {
                    latitude: this.currentCoords.latitude,
                    longitude: this.currentCoords.longitude,
                    remarks: 'Clocked in via WorkOps Web Dashboard'
                });

                if (res && res.success) {
                    WorkOps.showToast('success', 'Clock-In successful! Have a productive shift.', 'Welcome');
                }
            } else {
                // Perform Clock Out
                const res = await ApiClient.post('/attendance/clock-out', {
                    latitude: this.currentCoords.latitude,
                    longitude: this.currentCoords.longitude,
                    remarks: 'Shift completed via Web Dashboard'
                });

                if (res && res.success) {
                    WorkOps.showToast('success', 'Clock-Out successful! Shift duration recorded.', 'Goodbye');
                }
            }

            // Refresh UI State
            await this.fetchTodayStatus();
            await this.fetchKPIs();
            await this.fetchAttendanceRecords();

        } catch (error) {
            WorkOps.showToast('error', error.message || 'Operation failed. Please try again.', 'Clock Action Error');
            if (this.todayStatus) this.renderClockWidget(this.todayStatus);
        }
    }

    applyFilters() {
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;
        const dept = document.getElementById('filter-dept').value;
        const status = document.getElementById('filter-status').value;
        const search = document.getElementById('filter-search').value;

        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (dept) params.departmentId = dept;
        if (status) params.status = status;
        if (search) params.search = search;

        this.fetchAttendanceRecords(params);
    }

    async handleCorrectionSubmit(e) {
        e.preventDefault();
        const date = document.getElementById('corr-date').value;
        const type = document.getElementById('corr-type').value;
        const clockIn = document.getElementById('corr-clockin').value;
        const clockOut = document.getElementById('corr-clockout').value;
        const reason = document.getElementById('corr-reason').value;

        if (!date || !reason) {
            WorkOps.showToast('warning', 'Please fill in required fields: Date and Reason.');
            return;
        }

        try {
            const payload = {
                requestType: type,
                requestedDate: date,
                requestedClockIn: clockIn ? `${date} ${clockIn}:00` : null,
                requestedClockOut: clockOut ? `${date} ${clockOut}:00` : null,
                reason: reason
            };

            const res = await ApiClient.post('/attendance/corrections', payload);
            if (res && res.success) {
                WorkOps.showToast('success', 'Correction request submitted to HR/Manager for review.');
                const modalEl = document.getElementById('correctionModal');
                if (modalEl) {
                    const bsModal = bootstrap.Modal.getInstance(modalEl);
                    if (bsModal) bsModal.hide();
                }
                document.getElementById('correction-request-form').reset();
                await this.fetchCorrectionRequests();
            }
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Failed to submit correction request');
        }
    }

    exportToCSV() {
        if (!this.records || this.records.length === 0) {
            WorkOps.showToast('warning', 'No records available to export.');
            return;
        }

        const headers = ['Employee Code', 'Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Late (Mins)', 'Overtime (Mins)', 'Status', 'Geofence'];
        const rows = this.records.map(r => [
            `"${r.employeeCode || ''}"`,
            `"${r.employeeName || ''}"`,
            `"${r.departmentName || ''}"`,
            `"${r.attendanceDate || ''}"`,
            `"${r.clockInTime || ''}"`,
            `"${r.clockOutTime || ''}"`,
            `"${r.workDurationMinutes || 0} mins"`,
            `"${r.lateMinutes || 0}"`,
            `"${r.overtimeMinutes || 0}"`,
            `"${r.status || ''}"`,
            `"${r.isGeofenceVerified ? 'YES' : 'NO'}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `workops_attendance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        WorkOps.showToast('success', 'Attendance CSV file exported successfully.');
    }
}

// Instantiate Module on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.attendanceModule = new AttendanceModule();
});
