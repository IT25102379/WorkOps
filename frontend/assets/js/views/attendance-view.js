export class AttendanceView {
    getClockButton() {
        return document.getElementById('btn-clock-action');
    }

    getFilterValues() {
        return {
            startDate: document.getElementById('filter-start-date')?.value,
            endDate: document.getElementById('filter-end-date')?.value,
            departmentId: document.getElementById('filter-dept')?.value,
            status: document.getElementById('filter-status')?.value,
            search: document.getElementById('filter-search')?.value
        };
    }

    resetFilters() {
        ['filter-start-date', 'filter-end-date', 'filter-dept', 'filter-status', 'filter-search']
            .forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = '';
            });
    }

    getCorrectionFormValues() {
        const date = document.getElementById('corr-date')?.value;
        const clockIn = document.getElementById('corr-clockin')?.value;
        const clockOut = document.getElementById('corr-clockout')?.value;
        return {
            requestType: document.getElementById('corr-type')?.value,
            requestedDate: date,
            requestedClockIn: clockIn ? `${date} ${clockIn}:00` : null,
            requestedClockOut: clockOut ? `${date} ${clockOut}:00` : null,
            reason: document.getElementById('corr-reason')?.value
        };
    }

    resetCorrectionForm() {
        document.getElementById('correction-request-form')?.reset();
    }

    showLoadingRecords() {
        const body = document.getElementById('attendance-table-body');
        if (body) body.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><i class="fa-solid fa-circle-notch fa-spin me-2"></i> Fetching attendance records...</td></tr>';
    }

    showCoordinates(coords) {
        const element = document.getElementById('geo-coordinates-text');
        if (element) element.textContent = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    }

    showGeolocationFallback() {
        const coords = document.getElementById('geo-coordinates-text');
        const status = document.getElementById('geo-status-text');
        if (coords) coords.textContent = '6.927079, 79.861244 (HQ Geofence)';
        if (status) status.innerHTML = '<span class="text-info"><i class="fa-solid fa-location-dot me-1"></i> Office Radius Active</span>';
    }

    showGeolocationUnavailable() {
        const status = document.getElementById('geo-status-text');
        if (status) status.textContent = 'Geolocation not supported (Default HQ)';
    }

    setClockProcessing(processing) {
        const button = this.getClockButton();
        if (!button) return;
        button.disabled = processing;
        if (processing) button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    }

    updateKpis(kpi, animateCounter) {
        if (!kpi) return;
        animateCounter('kpi-present-count', kpi.totalPresentToday || 0);
        animateCounter('kpi-late-count', kpi.lateArrivalsCount || 0);
        animateCounter('kpi-ontime-rate', kpi.onTimePercentage || 0, '%');
        animateCounter('kpi-overtime-hours', kpi.totalOvertimeHours || 0, 'h');
        const pendingBadge = document.getElementById('pending-corrections-badge');
        if (pendingBadge) pendingBadge.textContent = kpi.pendingCorrectionRequests || 0;
    }

    renderClock(status, timerInterval, setTimerInterval) {
        const button = this.getClockButton();
        if (!button) return;
        if (timerInterval) clearInterval(timerInterval);
        setTimerInterval(null);

        const badge = document.getElementById('shift-status-badge');
        const timerContainer = document.getElementById('live-elapsed-container');
        const timerText = document.getElementById('live-elapsed-timer');
        const shiftMeta = document.getElementById('shift-meta-text');
        if (shiftMeta && status.shiftStartTime) shiftMeta.textContent = `Shift: ${status.shiftStartTime} - ${status.shiftEndTime} (Grace: ${status.gracePeriodMinutes}m)`;

        if (status.isClockedIn && !status.isClockedOut) {
            button.className = 'btn-clock-toggle clock-out-state';
            button.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Clock Out Now';
            button.disabled = false;
            if (badge) { badge.className = 'badge-status badge-present pulse-active'; badge.innerHTML = '<i class="fa-solid fa-circle text-success"></i> Shift Active (Clocked In)'; }
            if (timerContainer) timerContainer.style.display = 'inline-flex';
            const clockInDate = new Date(status.clockInTime);
            const updateTimer = () => {
                const totalSec = Math.floor(Math.max(0, new Date() - clockInDate) / 1000);
                if (timerText) timerText.textContent = `${String(Math.floor(totalSec / 3600)).padStart(2, '0')}h ${String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')}m ${String(totalSec % 60).padStart(2, '0')}s`;
            };
            updateTimer();
            setTimerInterval(setInterval(updateTimer, 1000));
        } else if (status.isClockedIn && status.isClockedOut) {
            button.className = 'btn-clock-toggle btn-secondary';
            button.innerHTML = '<i class="fa-solid fa-check-double"></i> Shift Completed Today';
            button.disabled = true;
            if (badge) { badge.className = 'badge-status badge-overtime'; badge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Shift Completed'; }
            if (timerContainer) timerContainer.style.display = 'inline-flex';
            if (timerText) timerText.textContent = status.elapsedFormatted || 'Completed';
        } else {
            button.className = 'btn-clock-toggle clock-in-state';
            button.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Clock In Now';
            button.disabled = false;
            if (badge) { badge.className = 'badge-status badge-absent'; badge.innerHTML = '<i class="fa-regular fa-circle"></i> Not Clocked In'; }
            if (timerContainer) timerContainer.style.display = 'none';
        }
    }

    renderRecordCount(count) {
        const element = document.getElementById('records-total-count');
        if (element) element.textContent = `${count} records found`;
    }

    renderEmptyRecords() {
        const body = document.getElementById('attendance-table-body');
        if (body) body.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="fa-solid fa-folder-open fs-2 mb-2 d-block opacity-50"></i>No attendance records match the selected filters.</td></tr>';
    }

    renderRecords(records, getStatusBadge, onDetail) {
        const body = document.getElementById('attendance-table-body');
        if (!body) return;
        this.renderRecordCount(records.length);
        if (!records.length) { this.renderEmptyRecords(); return; }
        body.innerHTML = records.map(record => {
            const statusBadge = getStatusBadge(record.status);
            const inTime = record.clockInTime ? record.clockInTime.substring(11, 16) : '--:--';
            const outTime = record.clockOutTime ? record.clockOutTime.substring(11, 16) : '--:--';
            const initials = (record.employeeName || 'Staff').split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2);
            return `<tr><td><div class="d-flex align-items-center gap-3"><div class="user-avatar sm">${initials}</div><div><div class="fw-bold text-primary">${record.employeeName || 'Unknown'}</div><div class="small text-muted">${record.employeeCode || '--'}</div></div></div></td><td>${record.attendanceDate || '--'}</td><td>${inTime}</td><td>${outTime}</td><td>${record.workDurationMinutes || 0} mins</td><td>${statusBadge}</td><td>${record.isGeofenceVerified ? '<span class="text-success">Verified</span>' : '<span class="text-warning">Unverified</span>'}</td><td class="text-end"><button class="btn btn-sm btn-outline-info btn-record-detail" data-id="${record.id}"><i class="fa-solid fa-eye"></i></button></td></tr>`;
        }).join('');
        body.querySelectorAll('.btn-record-detail').forEach(button => button.addEventListener('click', () => onDetail(Number(button.dataset.id))));
    }

    renderCorrections(corrections, onReview) {
        const list = document.getElementById('correction-requests-list');
        if (!list) return;
        list.innerHTML = corrections.length ? corrections.map(item => `<div class="correction-item mb-3 p-3 border rounded"><div class="d-flex justify-content-between"><strong>${item.employeeName || item.employeeCode || 'Employee'}</strong><span class="badge bg-warning">${item.status}</span></div><div class="small text-muted mt-2">${item.requestType} for ${item.requestedDate}</div><div class="small mt-2">${item.reason || ''}</div><div class="mt-3 d-flex gap-2"><button class="btn btn-sm btn-success btn-approve-req" data-id="${item.id}">Approve</button><button class="btn btn-sm btn-danger btn-reject-req" data-id="${item.id}">Reject</button></div></div>`).join('') : '<div class="text-muted small">No correction requests found.</div>';
        list.querySelectorAll('.btn-approve-req').forEach(button => button.addEventListener('click', () => onReview(Number(button.dataset.id), 'APPROVED')));
        list.querySelectorAll('.btn-reject-req').forEach(button => button.addEventListener('click', () => onReview(Number(button.dataset.id), 'REJECTED')));
    }

    showAuditDetails(record) {
        const modal = document.getElementById('auditModal');
        if (!modal) return;
        const values = {
            'audit-emp-name': record.employeeName,
            'audit-emp-code': record.employeeCode,
            'audit-date': record.attendanceDate,
            'audit-clock-in': record.clockInTime || 'N/A',
            'audit-clock-out': record.clockOutTime || 'Shift in progress',
            'audit-ip': record.clockInIp || '192.168.1.45',
            'audit-ua': record.clockInUserAgent || navigator.userAgent,
            'audit-remarks': record.remarks || 'Standard clock-in'
        };
        Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
        new bootstrap.Modal(modal).show();
    }
}
