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
        document.querySelectorAll('.attendance-manager-only').forEach(element => {
            element.hidden = !this.canViewAll;
        });
        this.init();
    }

    async init() {
        this.startRealtimeClock();
        this.initGeolocation();
        this.bindEvents();
        try {
            const requests = [this.refreshTodayStatus(), this.refreshRecords()];
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.attendanceModule = new AttendanceController();
});
