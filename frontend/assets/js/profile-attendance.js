import { ApiClient } from './api.js';
import { WorkOps } from './main.js';

const user = ApiClient.getCurrentUser();
if ((user?.role || '').toUpperCase() === 'ROLE_STAFF') {
    const coordinates = { latitude: 6.927079, longitude: 79.861244 };
    let status = null;

    document.addEventListener('DOMContentLoaded', () => {
        const pageBody = document.querySelector('.page-body');
        if (!pageBody) return;

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
                <div class="row g-3 mt-4 pt-3 border-top border-secondary small"><div class="col-sm-4"><span class="text-muted d-block">Check-in recorded</span><strong id="employee-check-in-time">--:--</strong></div><div class="col-sm-4"><span class="text-muted d-block">Check-out recorded</span><strong id="employee-check-out-time">--:--</strong></div><div class="col-sm-4"><span class="text-muted d-block">Latest log</span><strong id="employee-last-attendance">No record</strong></div></div>
            </div>`;
        pageBody.prepend(panel);
        updateSystemClock();
        setInterval(updateSystemClock, 1000);
        navigator.geolocation?.getCurrentPosition(position => {
            coordinates.latitude = position.coords.latitude;
            coordinates.longitude = position.coords.longitude;
            document.getElementById('employee-gps-status').textContent = 'GPS location verified';
        }, () => {});
        document.getElementById('employee-attendance-action').addEventListener('click', toggleAttendance);
        loadStatus();
    });

    async function loadStatus() {
        try {
            const response = await ApiClient.get('/attendance/status/today');
            status = response?.data;
            render();
            document.getElementById('employee-check-in-time').textContent = formatTime(status?.clockInTime);
            document.getElementById('employee-check-out-time').textContent = formatTime(status?.clockOutTime);
            const records = await ApiClient.get('/attendance/records');
            const latest = records?.data?.[0];
            if (latest) document.getElementById('employee-last-attendance').textContent = latest.attendanceDate;
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Unable to load attendance status.');
        }
    }

    async function toggleAttendance() {
        const button = document.getElementById('employee-attendance-action');
        const active = status?.isClockedIn && !status?.isClockedOut;
        button.disabled = true;
        try {
            const endpoint = active ? '/attendance/clock-out' : '/attendance/clock-in';
            const response = await ApiClient.post(endpoint, { ...coordinates, remarks: active ? 'Checked out from employee portal' : 'Checked in from employee portal' });
            if (!response?.success) throw new Error(response?.message || 'Attendance update failed');
            WorkOps.showToast('success', active ? 'Check-out recorded successfully.' : 'Check-in recorded successfully.');
            await loadStatus();
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Attendance update failed.');
            button.disabled = false;
        }
    }

    function render() {
        const button = document.getElementById('employee-attendance-action');
        const badge = document.getElementById('employee-attendance-status');
        if (!button || !badge || !status) return;
        if (status.isClockedIn && !status.isClockedOut) {
            badge.className = 'badge bg-success';
            badge.textContent = 'Shift active';
            button.className = 'btn btn-workops-danger px-4';
            button.innerHTML = '<i class="fa-solid fa-right-from-bracket me-2"></i>Check out';
        } else if (status.isClockedOut) {
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

    function formatDuration(seconds) { return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}m ${String(seconds % 60).padStart(2, '0')}s`; }
    function formatTime(value) { return value ? value.substring(11, 19) : '--:--:--'; }
    function updateSystemClock() {
        const now = new Date();
        const date = document.getElementById('employee-system-date');
        const time = document.getElementById('employee-system-time');
        if (date) date.textContent = now.toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'short', year:'numeric' });
        if (time) time.textContent = now.toLocaleTimeString('en-GB', { hour12:false });
        const mainTime = document.getElementById('employee-system-time-main');
        if (mainTime) mainTime.textContent = now.toLocaleTimeString('en-GB', { hour12:false });
    }
}
