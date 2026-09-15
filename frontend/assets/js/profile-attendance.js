import { ApiClient } from './api.js';
import { WorkOps } from './main.js';

const user = ApiClient.getCurrentUser();
if (user) {
    const coordinates = { latitude: 6.927079, longitude: 79.861244 };
    let status = null;

    function getShiftState(s) {
        if (!s) return { isClockedIn: false, isClockedOut: false };
        const hasClockIn = Boolean(s.isClockedIn || s.clockedIn || s.clockInTime);
        const hasClockOut = Boolean(s.isClockedOut || s.clockedOut || (s.clockInTime && s.clockOutTime));
        return {
            isClockedIn: hasClockIn && !hasClockOut,
            isClockedOut: hasClockOut
        };
    }

    function init() {
        const pageBody = document.querySelector('.page-body');
        if (!pageBody || document.querySelector('.employee-attendance-card')) return;

        const panel = document.createElement('section');
        panel.className = 'data-panel mb-4 employee-attendance-card';
        panel.innerHTML = `
            <div class="data-panel-header">
                <div><h2 class="data-panel-title"><i class="fa-solid fa-user-clock text-success"></i>Today's attendance</h2><p class="small text-muted mb-0">Mark your shift start and finish from your employee portal.</p></div>
                <span class="badge bg-secondary" id="employee-attendance-status">Loading...</span>
            </div>
            <div class="p-4">
                <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary"><div><div class="small text-muted text-uppercase">System date</div><strong id="employee-system-date">Loading...</strong></div><div class="text-end"><div class="small text-muted text-uppercase">System time</div><strong class="font-monospace" id="employee-system-time">00:00:00</strong></div></div>
                <div class="row align-items-center g-4">
                    <div class="col-md-7"><div class="small text-muted text-uppercase">System time</div><div class="display-6 fw-bold font-monospace" id="employee-system-time-main">00:00:00</div><div class="small text-muted mt-2"><i class="fa-solid fa-location-dot text-info me-1"></i><span id="employee-gps-status">Using office location</span></div></div>
                    <div class="col-md-5 text-md-end"><button class="btn btn-workops-success px-4" id="employee-attendance-action"><i class="fa-solid fa-right-to-bracket me-2"></i>Check in</button></div>
                </div>
                <div class="row g-3 mt-4 pt-3 border-top border-secondary small"><div class="col-sm-4"><span class="text-muted d-block">Check-in recorded</span><strong id="employee-check-in-time">--:--:--</strong></div><div class="col-sm-4"><span class="text-muted d-block">Check-out recorded</span><strong id="employee-check-out-time">--:--:--</strong></div><div class="col-sm-4"><span class="text-muted d-block">Latest log</span><strong id="employee-last-attendance">No record</strong></div></div>
            </div>`;
        pageBody.prepend(panel);
        updateSystemClock();
        setInterval(updateSystemClock, 1000);
        navigator.geolocation?.getCurrentPosition(position => {
            coordinates.latitude = position.coords.latitude;
            coordinates.longitude = position.coords.longitude;
            const gpsEl = document.getElementById('employee-gps-status');
            if (gpsEl) gpsEl.textContent = 'GPS location verified';
        }, () => {});
        document.getElementById('employee-attendance-action')?.addEventListener('click', toggleAttendance);
        loadStatus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function loadStatus() {
        try {
            const response = await ApiClient.get('/attendance/status/today');
            status = response?.data || response;
            render();
            const checkInEl = document.getElementById('employee-check-in-time');
            const checkOutEl = document.getElementById('employee-check-out-time');
            if (checkInEl) checkInEl.textContent = formatTime(status?.clockInTime);
            if (checkOutEl) checkOutEl.textContent = formatTime(status?.clockOutTime);
            
            const state = getShiftState(status);
            const lastLogEl = document.getElementById('employee-last-attendance');
            if (lastLogEl) {
                if (state.isClockedIn) {
                    lastLogEl.textContent = 'Today (Shift active)';
                } else if (state.isClockedOut) {
                    lastLogEl.textContent = 'Today (Completed)';
                }
            }

            try {
                const records = await ApiClient.get('/attendance/records');
                const list = Array.isArray(records?.data) ? records.data : (Array.isArray(records) ? records : []);
                const latest = list[0];
                if (lastLogEl && !state.isClockedIn && !state.isClockedOut) {
                    if (latest?.attendanceDate) {
                        lastLogEl.textContent = latest.attendanceDate;
                    } else {
                        lastLogEl.textContent = 'No record';
                    }
                }
            } catch (recErr) {
                console.warn('Could not fetch records:', recErr);
            }
        } catch (error) {
            console.error('Error loading attendance status:', error);
            WorkOps.showToast('error', error.message || 'Unable to load attendance status.');
        }
    }

    async function toggleAttendance() {
        const button = document.getElementById('employee-attendance-action');
        if (!button) return;
        const state = getShiftState(status);
        const isCurrentlyActive = state.isClockedIn;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Processing...';

        try {
            const endpoint = isCurrentlyActive ? '/attendance/clock-out' : '/attendance/clock-in';
            const response = await ApiClient.post(endpoint, { 
                ...coordinates, 
                remarks: isCurrentlyActive ? 'Checked out from employee portal' : 'Checked in from employee portal' 
            });
            if (response && response.success === false) {
                throw new Error(response.message || 'Attendance update failed');
            }
            WorkOps.showToast('success', isCurrentlyActive ? 'Check-out recorded successfully.' : 'Check-in recorded successfully.');
            await loadStatus();
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Attendance update failed.');
            render();
        }
    }

    function render() {
        const button = document.getElementById('employee-attendance-action');
        const badge = document.getElementById('employee-attendance-status');
        if (!button || !badge) return;

        const state = getShiftState(status);

        if (state.isClockedIn) {
            badge.className = 'badge bg-success';
            badge.textContent = 'Shift active';
            button.className = 'btn btn-workops-danger px-4';
            button.innerHTML = '<i class="fa-solid fa-right-from-bracket me-2"></i>Check out';
            button.disabled = false;
        } else if (state.isClockedOut) {
            badge.className = 'badge bg-info text-dark';
            badge.textContent = 'Shift completed';
            button.className = 'btn btn-secondary px-4';
            button.innerHTML = '<i class="fa-solid fa-check me-2"></i>Completed today';
            button.disabled = true;
        } else {
            badge.className = 'badge bg-warning text-dark';
            badge.textContent = 'Not checked in';
            button.className = 'btn btn-workops-success px-4';
            button.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i>Check in';
            button.disabled = false;
        }
    }

    function formatTime(value) {
        if (!value) return '--:--:--';
        if (typeof value === 'string') {
            if (value.includes('T') || value.includes(' ')) {
                const parts = value.split(/[T ]/);
                return parts[1] ? parts[1].substring(0, 8) : value;
            }
            if (value.length >= 8) return value.substring(0, 8);
            return value;
        }
        if (value instanceof Date) {
            return value.toLocaleTimeString('en-GB', { hour12: false });
        }
        return String(value);
    }

    function updateSystemClock() {
        const now = new Date();
        const date = document.getElementById('employee-system-date');
        const time = document.getElementById('employee-system-time');
        if (date) date.textContent = now.toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'short', year:'numeric' });
        if (time) time.textContent = now.toLocaleTimeString('en-GB', { hour12:false });
        const mainTime = document.getElementById('employee-system-time-main');
        if (mainTime) mainTime.textContent = now.toLocaleTimeString('en-GB', { hour12:false });
    }

    // =========================================================================
    // User Profile: Overtime (OT) Allocations & Request Hub
    // =========================================================================
    async function initUserOvertimeSection() {
        const pageBody = document.querySelector('.page-body');
        if (!pageBody || document.querySelector('.employee-ot-card')) return;

        const otPanel = document.createElement('section');
        otPanel.className = 'data-panel mt-4 employee-ot-card';
        otPanel.innerHTML = `
            <div class="data-panel-header d-flex justify-content-between align-items-center">
                <div>
                    <h2 class="data-panel-title mb-0">
                        <i class="fa-solid fa-bolt text-purple me-2" style="color: #7e22ce;"></i>My Overtime (OT) Records & Applications
                    </h2>
                    <p class="small text-muted mb-0">Track your approved overtime hours, assigned projects and submit new OT claims.</p>
                </div>
                <button class="btn btn-sm btn-workops-primary" id="btn-profile-apply-ot">
                    <i class="fa-solid fa-plus me-1"></i> Apply for Overtime
                </button>
            </div>
            <div class="p-4">
                <div class="row g-3 mb-4">
                    <div class="col-sm-4">
                        <div class="p-3 rounded-3 bg-light border">
                            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.72rem;">Approved OT Hours</div>
                            <div class="h4 mb-0 fw-bold text-success" id="profile-ot-approved-hours">0.0 hrs</div>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="p-3 rounded-3 bg-light border">
                            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.72rem;">Pending Requests</div>
                            <div class="h4 mb-0 fw-bold text-warning" id="profile-ot-pending-count">0 requests</div>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="p-3 rounded-3 bg-light border">
                            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.72rem;">Latest OT Status</div>
                            <div class="h5 mb-0 fw-bold text-purple" id="profile-ot-latest-status" style="color: #7e22ce;">None Active</div>
                        </div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Time Slot</th>
                                <th>Hours & Rate</th>
                                <th>Project / Task</th>
                                <th>Status</th>
                                <th>Approved By</th>
                            </tr>
                        </thead>
                        <tbody id="profile-ot-table-body">
                            <tr><td colspan="6" class="text-center text-muted py-3">Loading your overtime records...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        pageBody.appendChild(otPanel);
        await loadUserOvertime();

        document.getElementById('btn-profile-apply-ot')?.addEventListener('click', () => openProfileOtModal());
    }

    async function loadUserOvertime() {
        const tbody = document.getElementById('profile-ot-table-body');
        if (!tbody) return;

        try {
            const res = await ApiClient.get('/overtime/my');
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

            let totalApprovedHours = 0;
            let pendingCount = 0;

            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No overtime records registered for your profile.</td></tr>`;
                return;
            }

            tbody.innerHTML = list.map(ot => {
                const isApproved = ot.status === 'APPROVED';
                const isPending = ot.status === 'PENDING';
                if (isApproved) totalApprovedHours += (parseFloat(ot.otHours) || 0);
                if (isPending) pendingCount++;

                let badge = `<span class="badge bg-warning text-dark font-monospace">PENDING</span>`;
                if (isApproved) badge = `<span class="badge bg-success font-monospace">APPROVED</span>`;
                else if (ot.status === 'REJECTED') badge = `<span class="badge bg-danger font-monospace">REJECTED</span>`;

                const start = ot.startTime ? ot.startTime.substring(0, 5) : '--:--';
                const end = ot.endTime ? ot.endTime.substring(0, 5) : '--:--';

                return `
                    <tr>
                        <td class="font-monospace fw-bold">${ot.otDate || '--'}</td>
                        <td><span class="badge bg-light text-dark border font-monospace">${start} - ${end}</span></td>
                        <td><strong>${ot.otHours || 0}h</strong> <span class="badge bg-purple-subtle text-purple ms-1" style="background:#f3e8ff; color:#7e22ce;">${ot.multiplierRate || 1.5}x</span></td>
                        <td>
                            <div class="fw-medium">${ot.taskDescription || 'General Overtime'}</div>
                            <small class="text-muted">${ot.reason || ''}</small>
                        </td>
                        <td>${badge}</td>
                        <td class="small text-muted">${ot.approvedBy || '--'}</td>
                    </tr>
                `;
            }).join('');

            const approvedEl = document.getElementById('profile-ot-approved-hours');
            const pendingEl = document.getElementById('profile-ot-pending-count');
            const latestEl = document.getElementById('profile-ot-latest-status');

            if (approvedEl) approvedEl.textContent = `${totalApprovedHours.toFixed(1)} hrs`;
            if (pendingEl) pendingEl.textContent = `${pendingCount} requests`;
            if (latestEl && list[0]) latestEl.textContent = `${list[0].status} (${list[0].otDate})`;

        } catch (e) {
            console.error('Failed to load profile OT:', e);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Unable to fetch OT records.</td></tr>`;
        }
    }

    async function openProfileOtModal() {
        const { value: formValues } = await Swal.fire({
            title: 'Apply for Overtime (OT)',
            html: `
                <div class="text-start">
                    <label class="form-label small fw-bold mb-1">Overtime Date</label>
                    <input id="swal-ot-date" type="date" class="form-control mb-3" value="${new Date().toISOString().split('T')[0]}">
                    
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold mb-1">Start Time</label>
                            <input id="swal-ot-start" type="time" class="form-control" value="17:30">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold mb-1">End Time</label>
                            <input id="swal-ot-end" type="time" class="form-control" value="20:30">
                        </div>
                    </div>

                    <label class="form-label small fw-bold mb-1">Expected Hours</label>
                    <input id="swal-ot-hours" type="number" step="0.5" class="form-control mb-3" value="3.0">

                    <label class="form-label small fw-bold mb-1">Project / Task Description</label>
                    <input id="swal-ot-task" class="form-control mb-3" placeholder="e.g. Critical Bug Fixes / Deployment">

                    <label class="form-label small fw-bold mb-1">Justification Reason</label>
                    <textarea id="swal-ot-reason" class="form-control" rows="2" placeholder="Describe why overtime is required..."></textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-paper-plane me-1"></i> Submit to HR',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#4f46e5',
            preConfirm: () => {
                const date = document.getElementById('swal-ot-date').value;
                const start = document.getElementById('swal-ot-start').value;
                const end = document.getElementById('swal-ot-end').value;
                const hours = document.getElementById('swal-ot-hours').value;
                const task = document.getElementById('swal-ot-task').value;
                const reason = document.getElementById('swal-ot-reason').value;

                if (!date || !start || !end || !task) {
                    Swal.showValidationMessage('Please fill all required fields: Date, Times, and Project Task');
                    return false;
                }
                return { date, start, end, hours, task, reason };
            }
        });

        if (formValues) {
            const currentUser = ApiClient.getCurrentUser() || {};
            try {
                await ApiClient.post('/overtime', {
                    employeeCode: currentUser.employeeCode || 'EMP-004',
                    employeeName: currentUser.fullName || 'John Doe',
                    departmentName: currentUser.departmentName || 'Engineering & Technology',
                    otDate: formValues.date,
                    startTime: formValues.start,
                    endTime: formValues.end,
                    otHours: parseFloat(formValues.hours || 3.0),
                    multiplierRate: 1.5,
                    status: 'PENDING',
                    taskDescription: formValues.task,
                    reason: formValues.reason,
                    createdBy: currentUser.username || currentUser.fullName || 'Employee'
                });
                WorkOps.showToast('success', 'Overtime application submitted to HR Manager & recorded in database.');
                await loadUserOvertime();
            } catch (err) {
                WorkOps.showToast('error', err.message || 'Failed to submit OT application');
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserOvertimeSection);
    } else {
        initUserOvertimeSection();
    }
}
