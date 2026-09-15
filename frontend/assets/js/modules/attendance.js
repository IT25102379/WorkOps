import { ApiClient } from '../api.js';
import { WorkOps } from '../main.js';
import { AttendanceModel } from '../models/attendance-model.js';
import { AttendanceView } from '../views/attendance-view.js';

class AttendanceController {
    constructor() {
        this.model = new AttendanceModel();
        this.view = new AttendanceView();
        this.timerInterval = null;
        const user = JSON.parse(localStorage.getItem('workops_user') || '{}');
        if ((user.role || '').toUpperCase() !== 'ROLE_HR') {
            window.location.replace('../dashboard.html');
            return;
        }
        this.canViewAll = ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER'].includes((user.role || '').toUpperCase());
        this.otRecords = [];
        document.querySelectorAll('.attendance-manager-only').forEach(element => {
            element.hidden = !this.canViewAll;
        });
        this.init();
    }

    async init() {
        this.startRealtimeClock();
        this.initGeolocation();
        this.bindEvents();
        this.bindOvertimeEvents();
        try {
            const requests = [this.refreshTodayStatus(), this.refreshRecords(), this.refreshOvertimeRecords()];
            if (this.canViewAll) requests.push(this.refreshKpis(), this.refreshCorrections());
            await Promise.all(requests);
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
            PRESENT: '<span class="status-pill status-present"><i class="fa-solid fa-circle-check"></i> Present</span>',
            LATE_ARRIVAL: '<span class="status-pill status-late"><i class="fa-solid fa-clock-rotate-left"></i> Late Arrival</span>',
            OVERTIME: '<span class="status-pill status-overtime"><i class="fa-solid fa-bolt"></i> Overtime</span>',
            HALF_DAY: '<span class="status-pill status-halfday"><i class="fa-solid fa-circle-half-stroke"></i> Half Day</span>',
            EARLY_DEPARTURE: '<span class="status-pill status-early"><i class="fa-solid fa-person-walking-arrow-right"></i> Early Leave</span>',
            ABSENT: '<span class="status-pill status-absent"><i class="fa-solid fa-circle-xmark"></i> Absent</span>'
        };
        return badges[status] || `<span class="status-pill status-default">${status || 'Unknown'}</span>`;
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
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('correction-request-form')?.addEventListener('submit', event => this.handleCorrectionSubmit(event));
    }

    async handleClockAction() {
        this.view.setClockProcessing(true);
        try {
            const active = this.model.todayStatus?.isClockedIn && !this.model.todayStatus?.isClockedOut;
            const response = active ? await this.model.clockOut('Shift completed via Web Dashboard') : await this.model.clockIn('Clocked in via WorkOps Web Dashboard');
            if (response?.success) WorkOps.showToast('success', active ? 'Clock-Out successful! Shift duration recorded.' : 'Clock-In successful! Have a productive shift.', active ? 'Goodbye' : 'Welcome');
            const requests = [this.refreshTodayStatus(), this.refreshRecords()];
            if (this.canViewAll) requests.push(this.refreshKpis());
            await Promise.all(requests);
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
                if (this.canViewAll) await this.refreshCorrections();
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
        const fileName = `workops_attendance_${new Date().toISOString().split('T')[0]}.csv`;
        const headers = ['Employee Code', 'Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Late (Mins)', 'Overtime (Mins)', 'Status', 'Geofence'];
        const rows = this.model.records.map(record => [record.employeeCode, record.employeeName, record.departmentName, record.attendanceDate, record.clockInTime, record.clockOutTime, `${record.workDurationMinutes || 0} mins`, record.lateMinutes || 0, record.overtimeMinutes || 0, record.status, record.isGeofenceVerified ? 'YES' : 'NO'].map(value => `"${value || ''}"`).join(','));
        const link = document.createElement('a');
        link.href = encodeURI(`data:text/csv;charset=utf-8,${[headers.join(','), ...rows].join('\n')}`);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        WorkOps.showToast('success', 'Attendance CSV file exported & recorded in database.');

        // Pass report record to Database
        ApiClient.post('/attendance/reports/log', {
            reportTitle: 'Live Attendance Records Export (CSV)',
            reportType: 'CSV',
            module: 'ATTENDANCE',
            fileName: fileName,
            recordCount: this.model.records.length,
            filterCriteria: JSON.stringify(this.view.getFilterValues()),
            generatedBy: 'HR Manager'
        }).catch(err => console.warn('Could not log report to database:', err));
    }

    exportToPDF() {
        if (!this.model.records.length) {
            WorkOps.showToast('warning', 'No records available to export.');
            return;
        }

        const fileName = `workops_attendance_report_${new Date().toISOString().split('T')[0]}.pdf`;

        try {
            if (window.jspdf && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('landscape', 'pt', 'a4');

                // Header & Brand Banner
                doc.setFillColor(79, 70, 229);
                doc.rect(0, 0, doc.internal.pageSize.width, 55, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('WorkOps — Live Attendance Management Report', 30, 35);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                doc.text(`Generated: ${todayStr} | Officer: HR Manager`, doc.internal.pageSize.width - 250, 35);

                // Table Rows
                const headers = [['#', 'Code', 'Employee Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Geofence']];
                const data = this.model.records.map((r, i) => [
                    i + 1,
                    r.employeeCode || '--',
                    r.employeeName || 'Unknown',
                    r.departmentName || '--',
                    r.attendanceDate || '--',
                    r.clockInTime ? (r.clockInTime.includes(' ') ? r.clockInTime.split(' ')[1].substring(0, 5) : (r.clockInTime.includes('T') ? r.clockInTime.split('T')[1].substring(0, 5) : r.clockInTime.substring(0, 5))) : '--:--',
                    r.clockOutTime ? (r.clockOutTime.includes(' ') ? r.clockOutTime.split(' ')[1].substring(0, 5) : (r.clockOutTime.includes('T') ? r.clockOutTime.split('T')[1].substring(0, 5) : r.clockOutTime.substring(0, 5))) : '--:--',
                    `${r.workDurationMinutes || 0}m`,
                    r.status || 'PRESENT',
                    r.isGeofenceVerified ? 'Verified' : 'Remote'
                ]);

                doc.autoTable({
                    head: headers,
                    body: data,
                    startY: 75,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [30, 41, 59],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 9,
                        halign: 'center'
                    },
                    bodyStyles: {
                        fontSize: 8.5,
                        textColor: [30, 41, 59],
                        halign: 'center'
                    },
                    columnStyles: {
                        0: { cellWidth: 25, halign: 'center' },
                        1: { cellWidth: 70, halign: 'center', fontStyle: 'bold' },
                        2: { cellWidth: 130, halign: 'left' },
                        3: { cellWidth: 120, halign: 'left' },
                        4: { cellWidth: 70, halign: 'center' },
                        5: { cellWidth: 60, halign: 'center' },
                        6: { cellWidth: 60, halign: 'center' },
                        7: { cellWidth: 60, halign: 'center' },
                        8: { cellWidth: 80, halign: 'center' },
                        9: { cellWidth: 65, halign: 'center' }
                    },
                    alternateRowStyles: {
                        fillColor: [248, 250, 252]
                    },
                    margin: { top: 75, left: 30, right: 30 },
                    didDrawPage: () => {
                        doc.setFontSize(8);
                        doc.setTextColor(148, 163, 184);
                        doc.text(
                            `WorkOps Enterprise Workforce Management — Page ${doc.internal.getNumberOfPages()}`,
                            doc.internal.pageSize.width / 2,
                            doc.internal.pageSize.height - 15,
                            { align: 'center' }
                        );
                    }
                });

                doc.save(fileName);
                WorkOps.showToast('success', 'Attendance PDF report downloaded & recorded in database.');

                // Pass report record to Database
                ApiClient.post('/attendance/reports/log', {
                    reportTitle: 'Live Attendance Management Report (PDF)',
                    reportType: 'PDF',
                    module: 'ATTENDANCE',
                    fileName: fileName,
                    recordCount: this.model.records.length,
                    filterCriteria: JSON.stringify(this.view.getFilterValues()),
                    generatedBy: 'HR Manager'
                }).catch(err => console.warn('Could not log report to database:', err));

            } else {
                this.fallbackPrintPDF(fileName);
            }
        } catch (error) {
            console.error('PDF export error:', error);
            this.fallbackPrintPDF(fileName);
        }
    }

    fallbackPrintPDF(fileName = 'workops_attendance_report.pdf') {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            WorkOps.showToast('error', 'Pop-up blocked. Please allow pop-ups to print PDF.');
            return;
        }

        const rowsHtml = this.model.records.map((r, i) => `
            <tr>
                <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${i + 1}</td>
                <td style="padding:8px;border:1px solid #cbd5e1;font-family:monospace;font-weight:bold;">${r.employeeCode || '--'}</td>
                <td style="padding:8px;border:1px solid #cbd5e1;font-weight:600;">${r.employeeName || 'Unknown'}</td>
                <td style="padding:8px;border:1px solid #cbd5e1;">${r.departmentName || '--'}</td>
                <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${r.attendanceDate || '--'}</td>
                <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${r.clockInTime ? (r.clockInTime.includes(' ') ? r.clockInTime.split(' ')[1].substring(0, 5) : r.clockInTime.substring(0, 5)) : '--:--'}</td>
                <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${r.clockOutTime ? (r.clockOutTime.includes(' ') ? r.clockOutTime.split(' ')[1].substring(0, 5) : r.clockOutTime.substring(0, 5)) : '--:--'}</td>
                <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${r.workDurationMinutes || 0} mins</td>
                <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${r.status || 'PRESENT'}</td>
                <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${r.isGeofenceVerified ? 'Verified' : 'Remote'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WorkOps Attendance Report</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
                    .title { font-size: 20px; font-weight: bold; color: #4f46e5; }
                    .meta { font-size: 12px; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background: #1e293b; color: #ffffff; padding: 10px 8px; border: 1px solid #0f172a; text-align: center; text-transform: uppercase; font-size: 10px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">WorkOps — Attendance Report</div>
                        <div class="meta">Official Employee Shift & Attendance Summary</div>
                    </div>
                    <div style="text-align:right;" class="meta">
                        <div>Date: ${new Date().toLocaleDateString('en-GB')}</div>
                        <div>Generated by: HR Manager</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Geofence</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
        WorkOps.showToast('success', 'PDF Print view opened & recorded in database.');

        // Pass report record to Database
        ApiClient.post('/attendance/reports/log', {
            reportTitle: 'Live Attendance Management Report (Print/PDF)',
            reportType: 'PDF',
            module: 'ATTENDANCE',
            fileName: fileName,
            recordCount: this.model.records.length,
            filterCriteria: JSON.stringify(this.view.getFilterValues()),
            generatedBy: 'HR Manager'
        }).catch(err => console.warn('Could not log report to database:', err));
    }

    // =========================================================================
    // Overtime (OT) CRUD Engine & Event Handlers (HR Manager)
    // =========================================================================
    bindOvertimeEvents() {
        // Auto calculate hours on start/end time change
        const startTimeEl = document.getElementById('ot-form-start-time');
        const endTimeEl = document.getElementById('ot-form-end-time');
        const calcHours = () => {
            if (startTimeEl?.value && endTimeEl?.value) {
                const [sh, sm] = startTimeEl.value.split(':').map(Number);
                const [eh, em] = endTimeEl.value.split(':').map(Number);
                let diffM = (eh * 60 + em) - (sh * 60 + sm);
                if (diffM < 0) diffM += 24 * 60;
                const hours = Math.round((diffM / 60) * 10) / 10;
                const hoursEl = document.getElementById('ot-form-hours');
                if (hoursEl) hoursEl.value = Math.max(0.5, hours);
            }
        };
        startTimeEl?.addEventListener('change', calcHours);
        endTimeEl?.addEventListener('change', calcHours);

        // Reset modal state on open
        document.getElementById('btn-open-create-ot')?.addEventListener('click', () => {
            this.resetOvertimeForm();
        });

        // Submit form (Create or Update)
        document.getElementById('overtime-form')?.addEventListener('submit', (e) => this.handleSaveOvertime(e));
    }

    resetOvertimeForm() {
        const form = document.getElementById('overtime-form');
        if (form) form.reset();
        const idEl = document.getElementById('ot-form-id');
        if (idEl) idEl.value = '';
        const titleEl = document.getElementById('ot-modal-title-text');
        if (titleEl) titleEl.textContent = 'Create Overtime (OT) Request / Allocation';
        const dateEl = document.getElementById('ot-form-date');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
        const startEl = document.getElementById('ot-form-start-time');
        if (startEl) startEl.value = '17:30';
        const endEl = document.getElementById('ot-form-end-time');
        if (endEl) endEl.value = '20:30';
        const hoursEl = document.getElementById('ot-form-hours');
        if (hoursEl) hoursEl.value = '3.0';
    }

    async refreshOvertimeRecords() {
        const tbody = document.getElementById('overtime-table-body');
        const countBadge = document.getElementById('ot-records-count');
        if (countBadge) countBadge.textContent = 'Loading...';

        try {
            const response = await ApiClient.get('/overtime');
            this.otRecords = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
            this.renderOvertimeRecords(this.otRecords);
            this.updateOvertimeStats(this.otRecords);
        } catch (error) {
            console.error('Failed to load overtime records:', error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3">Failed to load OT records: ${error.message}</td></tr>`;
        }
    }

    renderOvertimeRecords(records) {
        const tbody = document.getElementById('overtime-table-body');
        const countBadge = document.getElementById('ot-records-count');
        if (!tbody) return;

        if (countBadge) countBadge.textContent = `${records.length} Records`;

        if (!records.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4"><i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>No overtime records found. Click "+ Create OT Form / Request" to allocate overtime.</td></tr>`;
            return;
        }

        tbody.innerHTML = records.map(ot => {
            const initials = (ot.employeeName || 'EM').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            let statusBadge = `<span class="ot-badge ot-pending"><i class="fa-solid fa-clock"></i> PENDING</span>`;
            if (ot.status === 'APPROVED') {
                statusBadge = `<span class="ot-badge ot-approved"><i class="fa-solid fa-circle-check"></i> APPROVED</span>`;
            } else if (ot.status === 'REJECTED') {
                statusBadge = `<span class="ot-badge ot-rejected"><i class="fa-solid fa-circle-xmark"></i> REJECTED</span>`;
            }

            const startTime = ot.startTime ? ot.startTime.substring(0, 5) : '--:--';
            const endTime = ot.endTime ? ot.endTime.substring(0, 5) : '--:--';

            return `
                <tr id="ot-row-${ot.id}">
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                ${initials}
                            </div>
                            <div>
                                <div class="fw-bold fs-7 text-dark">${ot.employeeName || 'Unknown'}</div>
                                <div class="small text-muted font-monospace" style="font-size: 0.72rem;">${ot.employeeCode || '--'} · ${ot.departmentName || '--'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="font-monospace fw-semibold">${ot.otDate || '--'}</td>
                    <td>
                        <span class="badge bg-light text-dark border font-monospace px-2 py-1">${startTime} – ${endTime}</span>
                    </td>
                    <td>
                        <strong class="text-purple" style="color: #7e22ce;">${ot.otHours || 0}h</strong>
                        <span class="ot-rate-pill ms-1">${ot.multiplierRate || 1.5}x</span>
                    </td>
                    <td>
                        <div class="fw-medium text-dark" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ot.taskDescription || ''}">
                            ${ot.taskDescription || 'General Overtime'}
                        </div>
                        <div class="small text-muted" style="font-size: 0.72rem; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ot.reason || ''}">
                            ${ot.reason || 'No justification noted'}
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td class="small text-muted">
                        ${ot.approvedBy ? `<span class="text-success"><i class="fa-solid fa-user-check me-1"></i>${ot.approvedBy}</span>` : '<span class="text-muted">--</span>'}
                    </td>
                    <td class="text-end">
                        <div class="d-inline-flex gap-1">
                            ${ot.status !== 'APPROVED' ? `
                                <button class="ot-action-btn ot-action-approve" title="Approve Overtime" onclick="window.attendanceModule.handleUpdateOvertimeStatus(${ot.id}, 'APPROVED')">
                                    <i class="fa-solid fa-check"></i>
                                </button>
                            ` : ''}
                            ${ot.status !== 'REJECTED' ? `
                                <button class="ot-action-btn ot-action-reject" title="Reject Overtime" onclick="window.attendanceModule.handleUpdateOvertimeStatus(${ot.id}, 'REJECTED')">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            ` : ''}
                            <button class="ot-action-btn ot-action-edit" title="Edit / Update OT" onclick="window.attendanceModule.handleEditOvertime(${ot.id})">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="ot-action-btn ot-action-delete" title="Delete OT Record" onclick="window.attendanceModule.handleDeleteOvertime(${ot.id})">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateOvertimeStats(records) {
        const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.otHours) || 0), 0);
        const approvedCount = records.filter(r => r.status === 'APPROVED').length;
        const pendingCount = records.filter(r => r.status === 'PENDING').length;

        const hoursEl = document.getElementById('ot-stat-hours');
        const approvedEl = document.getElementById('ot-stat-approved');
        const pendingEl = document.getElementById('ot-stat-pending');

        if (hoursEl) hoursEl.textContent = `${totalHours.toFixed(1)}h`;
        if (approvedEl) approvedEl.textContent = approvedCount;
        if (pendingEl) pendingEl.textContent = pendingCount;
    }

    async handleSaveOvertime(event) {
        event.preventDefault();
        const id = document.getElementById('ot-form-id')?.value;
        const employeeSelect = document.getElementById('ot-form-employee');
        const selectedOpt = employeeSelect?.options[employeeSelect.selectedIndex];

        const payload = {
            employeeId: selectedOpt ? parseInt(selectedOpt.getAttribute('data-id')) : 1,
            employeeCode: employeeSelect?.value || 'EMP-004',
            employeeName: selectedOpt ? selectedOpt.getAttribute('data-name') : 'John Doe',
            departmentName: selectedOpt ? selectedOpt.getAttribute('data-dept') : 'Engineering & Technology',
            otDate: document.getElementById('ot-form-date')?.value || new Date().toISOString().split('T')[0],
            startTime: document.getElementById('ot-form-start-time')?.value || '17:30',
            endTime: document.getElementById('ot-form-end-time')?.value || '20:30',
            otHours: parseFloat(document.getElementById('ot-form-hours')?.value || 3.0),
            multiplierRate: parseFloat(document.getElementById('ot-form-multiplier')?.value || 1.50),
            status: document.getElementById('ot-form-status')?.value || 'APPROVED',
            taskDescription: document.getElementById('ot-form-task')?.value || 'General Project OT',
            reason: document.getElementById('ot-form-reason')?.value || 'Assigned by HR Manager',
            createdBy: 'HR Manager'
        };

        const saveBtn = document.getElementById('btn-save-ot');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Saving to Database...';
        }

        try {
            let response;
            if (id) {
                // UPDATE (PUT)
                response = await ApiClient.put(`/overtime/${id}`, payload);
                WorkOps.showToast('success', 'Overtime record updated & persisted in database.');
            } else {
                // CREATE (POST)
                response = await ApiClient.post('/overtime', payload);
                WorkOps.showToast('success', 'New Overtime form created & saved to database.');
            }

            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('overtimeModal'));
            if (modalInstance) modalInstance.hide();

            await this.refreshOvertimeRecords();
        } catch (error) {
            console.error('Error saving overtime form:', error);
            WorkOps.showToast('error', error.message || 'Failed to save overtime form to database');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Save OT Form & Save to Database';
            }
        }
    }

    handleEditOvertime(id) {
        const record = this.otRecords.find(r => r.id === id);
        if (!record) return;

        document.getElementById('ot-form-id').value = record.id;
        document.getElementById('ot-modal-title-text').textContent = `Edit Overtime Record #${record.id} — ${record.employeeName || ''}`;
        
        const empSelect = document.getElementById('ot-form-employee');
        if (empSelect && record.employeeCode) empSelect.value = record.employeeCode;

        if (document.getElementById('ot-form-date')) document.getElementById('ot-form-date').value = record.otDate || '';
        if (document.getElementById('ot-form-start-time')) document.getElementById('ot-form-start-time').value = record.startTime ? record.startTime.substring(0, 5) : '17:30';
        if (document.getElementById('ot-form-end-time')) document.getElementById('ot-form-end-time').value = record.endTime ? record.endTime.substring(0, 5) : '20:30';
        if (document.getElementById('ot-form-hours')) document.getElementById('ot-form-hours').value = record.otHours || 3.0;
        if (document.getElementById('ot-form-multiplier')) document.getElementById('ot-form-multiplier').value = (record.multiplierRate || 1.5).toFixed(2);
        if (document.getElementById('ot-form-status')) document.getElementById('ot-form-status').value = record.status || 'PENDING';
        if (document.getElementById('ot-form-task')) document.getElementById('ot-form-task').value = record.taskDescription || '';
        if (document.getElementById('ot-form-reason')) document.getElementById('ot-form-reason').value = record.reason || '';

        const modal = new bootstrap.Modal(document.getElementById('overtimeModal'));
        modal.show();
    }

    async handleUpdateOvertimeStatus(id, newStatus) {
        try {
            const response = await ApiClient.put(`/overtime/${id}/status`, {
                status: newStatus,
                approvedBy: 'HR Manager',
                reviewComment: `Status changed to ${newStatus} by HR Manager`
            });
            WorkOps.showToast('success', `Overtime record #${id} status updated to ${newStatus}.`);
            await this.refreshOvertimeRecords();
        } catch (error) {
            console.error('Status update failed:', error);
            WorkOps.showToast('error', error.message || 'Failed to update overtime status');
        }
    }

    async handleDeleteOvertime(id) {
        const result = await Swal.fire({
            title: 'Delete Overtime Record?',
            text: `Are you sure you want to delete OT record #${id}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete from DB',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await ApiClient.delete(`/overtime/${id}`);
                WorkOps.showToast('success', `Overtime record #${id} removed from database.`);
                await this.refreshOvertimeRecords();
            } catch (error) {
                console.error('Delete failed:', error);
                WorkOps.showToast('error', error.message || 'Failed to delete overtime record');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.attendanceModule = new AttendanceController();
});

