import { ApiClient } from '../api.js';
import { WorkOps } from '../main.js';

class PayrollController {
    constructor() {
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.records = [];
        this.otSummaries = [];
        this.historyRecords = [];
        this.events = [];
        this.init();
    }

    async init() {
        this.checkAuth();
        this.bindEvents();
        await Promise.all([
            this.loadSalaryRecords(),
            this.loadOvertimeSummary(),
            this.loadPayrollHistory(),
            this.loadEvents()
        ]);
    }

    checkAuth() {
        const user = JSON.parse(localStorage.getItem('workops_user') || '{}');
        const role = (user.role || '').toUpperCase();
        
        // Update sidebar session display
        document.querySelectorAll('.session-name').forEach(el => el.textContent = user.fullName || 'David Beck');
        document.querySelectorAll('.session-role').forEach(el => el.textContent = user.designation || 'Payroll Officer');
        document.querySelectorAll('.session-avatar').forEach(el => {
            const name = user.fullName || 'PO';
            el.textContent = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        });
    }

    bindEvents() {
        // Tab Navigation
        document.querySelectorAll('.payroll-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.payroll-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.payroll-tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.getAttribute('data-target');
                const content = document.getElementById(target);
                if (content) content.classList.add('active');
            });
        });

        // Filter / Search
        document.getElementById('payroll-search')?.addEventListener('input', (e) => this.filterSalaryRecords());
        document.getElementById('payroll-dept-filter')?.addEventListener('change', () => this.filterSalaryRecords());
        document.getElementById('payroll-month-select')?.addEventListener('change', (e) => {
            const [m, y] = e.target.value.split('-').map(Number);
            this.currentMonth = m;
            this.currentYear = y;
            this.loadSalaryRecords();
            this.loadOvertimeSummary();
        });

        // Generate Payroll Modal Form Submit
        document.getElementById('payroll-run-form')?.addEventListener('submit', (e) => this.handleGeneratePayroll(e));

        // Create Event Form Submit
        document.getElementById('event-create-form')?.addEventListener('submit', (e) => this.handleCreateEvent(e));

        // Export Actions
        document.getElementById('export-payroll-csv-btn')?.addEventListener('click', () => this.exportSalaryCSV());
        document.getElementById('export-payroll-pdf-btn')?.addEventListener('click', () => this.exportSalaryPDF());
        document.getElementById('quick-run-payroll-btn')?.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('generatePayrollModal'));
            modal.show();
        });
    }

    fmt(n) {
        return 'LKR ' + (parseFloat(n) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // =========================================================================
    // 1. Salary Records (පඩි විස්තර)
    // =========================================================================
    async loadSalaryRecords() {
        const tbody = document.getElementById('payroll-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading salary records from database...</td></tr>`;

        try {
            const res = await ApiClient.get('/payroll/records', { month: this.currentMonth, year: this.currentYear });
            this.records = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            this.renderSalaryRecords(this.records);
            this.updateSummaryMetrics(this.records);
        } catch (e) {
            console.error('Error loading salary records:', e);
            if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Failed to load salary records from database: ${e.message}</td></tr>`;
        }
    }

    renderSalaryRecords(data) {
        const tbody = document.getElementById('payroll-tbody');
        if (!tbody) return;

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4"><i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>No salary records found for this period. Click "Execute Payroll Run" to process.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map((p, idx) => {
            const initials = (p.employeeName || 'EM').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const statusClass = p.paymentStatus === 'PAID' ? 'badge-approved' : (p.paymentStatus === 'PROCESSED' ? 'badge-pending' : 'badge-default');
            const statusLabel = p.paymentStatus || 'DRAFT';

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="user-avatar" style="width: 34px; height: 34px; font-size: 0.8rem; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                ${initials}
                            </div>
                            <div>
                                <div class="fw-bold fs-7 text-dark">${p.employeeName || 'Unknown'}</div>
                                <div class="small text-muted font-monospace" style="font-size: 0.72rem;">${p.employeeCode || '--'} · ${p.designation || 'Staff'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="small">${p.departmentName || 'General'}</td>
                    <td class="font-monospace fw-semibold text-dark">${this.fmt(p.basicSalary)}</td>
                    <td class="font-monospace text-success">+${this.fmt(p.allowances)}</td>
                    <td class="font-monospace" style="color: #7e22ce;">${parseFloat(p.overtimePay) > 0 ? '+' + this.fmt(p.overtimePay) : '<span class="text-muted">—</span>'}</td>
                    <td class="font-monospace text-danger">-${this.fmt(p.deductions)}</td>
                    <td class="font-monospace fw-bold" style="color: #0891b2; font-size: 0.95rem;">${this.fmt(p.netSalary)}</td>
                    <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="action-btn action-btn-view" title="View & Print Payslip" onclick="window.payrollModule.viewPayslip(${p.id || idx})">
                                <i class="fa-solid fa-file-invoice"></i>
                            </button>
                            ${p.paymentStatus !== 'PAID' ? `
                                <button class="action-btn action-btn-approve" title="Mark as Paid" onclick="window.payrollModule.markAsPaid(${p.id || idx})">
                                    <i class="fa-solid fa-check-double text-success"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateSummaryMetrics(data) {
        let totalNet = 0, totalBasic = 0, totalOt = 0, totalDeductions = 0, paidCount = 0;
        data.forEach(p => {
            totalNet += parseFloat(p.netSalary) || 0;
            totalBasic += parseFloat(p.basicSalary) || 0;
            totalOt += parseFloat(p.overtimePay) || 0;
            totalDeductions += parseFloat(p.deductions) || 0;
            if (p.paymentStatus === 'PAID') paidCount++;
        });

        const netEl = document.getElementById('stat-total-net');
        const countEl = document.getElementById('stat-paid-count');
        const otEl = document.getElementById('stat-total-ot');
        const dedEl = document.getElementById('stat-total-deductions');
        const netFooterEl = document.getElementById('payroll-total-net-footer');

        if (netEl) netEl.textContent = this.fmt(totalNet);
        if (countEl) countEl.textContent = `${paidCount} / ${data.length} Processed`;
        if (otEl) otEl.textContent = this.fmt(totalOt);
        if (dedEl) dedEl.textContent = this.fmt(totalDeductions);
        if (netFooterEl) netFooterEl.textContent = this.fmt(totalNet);
    }

    filterSalaryRecords() {
        const query = (document.getElementById('payroll-search')?.value || '').toLowerCase();
        const dept = document.getElementById('payroll-dept-filter')?.value || '';

        const filtered = this.records.filter(p => {
            const matchesQuery = (p.employeeName || '').toLowerCase().includes(query) || (p.employeeCode || '').toLowerCase().includes(query);
            const matchesDept = !dept || (p.departmentName || '').includes(dept);
            return matchesQuery && matchesDept;
        });

        this.renderSalaryRecords(filtered);
    }

    // =========================================================================
    // 2. Overtime (OT) Calculation (ඕටී ගණනය කිරීම)
    // =========================================================================
    async loadOvertimeSummary() {
        const tbody = document.getElementById('ot-calc-tbody');
        if (!tbody) return;

        try {
            const res = await ApiClient.get('/payroll/overtime-summary', { month: this.currentMonth, year: this.currentYear });
            this.otSummaries = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            this.renderOvertimeSummary(this.otSummaries);
        } catch (e) {
            console.error('Error loading OT summary:', e);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Unable to load Overtime calculations.</td></tr>`;
        }
    }

    renderOvertimeSummary(data) {
        const tbody = document.getElementById('ot-calc-tbody');
        if (!tbody) return;

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No approved overtime records logged for this month.</td></tr>`;
            return;
        }

        let totalOtHours = 0, totalOtPayout = 0;

        tbody.innerHTML = data.map(ot => {
            totalOtHours += parseFloat(ot.approvedOtHours) || 0;
            totalOtPayout += parseFloat(ot.totalOtPayout) || 0;
            const initials = (ot.employeeName || 'EM').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                ${initials}
                            </div>
                            <div>
                                <div class="fw-bold fs-7 text-dark">${ot.employeeName}</div>
                                <div class="small text-muted font-monospace" style="font-size: 0.72rem;">${ot.employeeCode} · ${ot.departmentName}</div>
                            </div>
                        </div>
                    </td>
                    <td class="font-monospace">${this.fmt(ot.basicSalary)}</td>
                    <td><strong class="text-purple" style="color:#7e22ce;">${ot.approvedOtHours} hrs</strong></td>
                    <td class="font-monospace text-muted">${this.fmt(ot.hourlyOtRate)}/hr</td>
                    <td><span class="badge bg-purple-subtle text-purple font-monospace" style="background:#f3e8ff; color:#7e22ce; border:1px solid #d8b4fe;">${ot.totalApprovedRecords} Claims</span></td>
                    <td class="font-monospace fw-bold text-success fs-6">${this.fmt(ot.totalOtPayout)}</td>
                    <td><span class="badge bg-success font-monospace">APPROVED (DB)</span></td>
                </tr>
            `;
        }).join('');

        const otTotalHoursEl = document.getElementById('ot-calc-total-hours');
        const otTotalPayoutEl = document.getElementById('ot-calc-total-payout');
        if (otTotalHoursEl) otTotalHoursEl.textContent = `${totalOtHours.toFixed(1)} hrs`;
        if (otTotalPayoutEl) otTotalPayoutEl.textContent = this.fmt(totalOtPayout);
    }

    // =========================================================================
    // 3. Payroll Generation (පඩි සැකසීම)
    // =========================================================================
    async handleGeneratePayroll(e) {
        e.preventDefault();
        const month = parseInt(document.getElementById('gen-month')?.value || this.currentMonth);
        const year = parseInt(document.getElementById('gen-year')?.value || this.currentYear);
        const deptId = document.getElementById('gen-dept')?.value ? parseInt(document.getElementById('gen-dept').value) : null;
        const includeOt = document.getElementById('gen-include-ot')?.checked !== false;
        const bonus = parseFloat(document.getElementById('gen-bonus')?.value || 0);

        const btn = document.getElementById('btn-execute-payroll');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Calculating & Persisting to Database...';
        }

        try {
            const res = await ApiClient.post('/payroll/generate', {
                payrollMonth: month,
                payrollYear: year,
                departmentId: deptId,
                includeOvertime: includeOt,
                bonusAmount: bonus
            });

            WorkOps.showToast('success', `Monthly Payroll for ${month}/${year} executed and saved to SQL Server database!`);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('generatePayrollModal'));
            if (modal) modal.hide();

            this.currentMonth = month;
            this.currentYear = year;
            await Promise.all([this.loadSalaryRecords(), this.loadPayrollHistory()]);
        } catch (error) {
            console.error('Payroll generation error:', error);
            WorkOps.showToast('error', error.message || 'Failed to execute payroll run.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-bolt me-2"></i> Execute & Save Payroll to Database';
            }
        }
    }

    // =========================================================================
    // 4. Salary History & Payslip View (පසුගිය පඩි වාර්තා & පේස්ලිප්)
    // =========================================================================
    async loadPayrollHistory() {
        const tbody = document.getElementById('payroll-history-tbody');
        if (!tbody) return;

        try {
            const res = await ApiClient.get('/payroll/history');
            this.historyRecords = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            this.renderPayrollHistory(this.historyRecords);
        } catch (e) {
            console.error('Error loading history:', e);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No historical records available.</td></tr>`;
        }
    }

    renderPayrollHistory(data) {
        const tbody = document.getElementById('payroll-history-tbody');
        if (!tbody) return;

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No historical payroll runs found in database.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(p => `
            <tr>
                <td class="font-monospace fw-bold">${p.payrollMonth}/${p.payrollYear}</td>
                <td>
                    <div class="fw-bold">${p.employeeName}</div>
                    <div class="small text-muted">${p.employeeCode} · ${p.departmentName}</div>
                </td>
                <td class="font-monospace">${this.fmt(p.basicSalary)}</td>
                <td class="font-monospace text-purple" style="color:#7e22ce;">${this.fmt(p.overtimePay)}</td>
                <td class="font-monospace fw-bold text-success">${this.fmt(p.netSalary)}</td>
                <td><span class="badge ${p.paymentStatus === 'PAID' ? 'bg-success' : 'bg-info text-dark'} font-monospace">${p.paymentStatus}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary py-1 px-2" onclick="window.payrollModule.viewPayslip(${p.id})">
                        <i class="fa-solid fa-file-invoice me-1"></i> Payslip
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async viewPayslip(id) {
        const p = this.records.find(x => x.id === id) || this.historyRecords.find(x => x.id === id) || this.records[0];
        if (!p) return;

        const content = document.getElementById('payslip-content');
        if (!content) return;

        const basic = parseFloat(p.basicSalary) || 0;
        const allowances = parseFloat(p.allowances) || 0;
        const ot = parseFloat(p.overtimePay) || 0;
        const deductions = parseFloat(p.deductions) || 0;
        const net = parseFloat(p.netSalary) || (basic + allowances + ot - deductions);
        const epf = basic * 0.08;
        const tax = Math.max(0, deductions - epf);

        content.innerHTML = `
            <div style="border:1px solid rgba(0,0,0,0.1); border-radius:14px; overflow:hidden; background:#ffffff;">
                <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding:24px; color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; letter-spacing:-0.03em;">Work<span style="color:#38bdf8;">Ops</span> Enterprise</div>
                        <div style="font-size:0.78rem; color:#94a3b8;">Official Workforce Salary Remittance Payslip</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Pay Period</div>
                        <div style="font-weight:700; font-size:1.1rem; color:#38bdf8;">${p.payrollMonth || this.currentMonth} / ${p.payrollYear || this.currentYear}</div>
                    </div>
                </div>

                <div class="p-4">
                    <div class="row g-3 mb-4 pb-3 border-bottom">
                        <div class="col-md-6">
                            <div class="small text-muted text-uppercase fw-bold" style="font-size:0.7rem;">Employee Details</div>
                            <div class="h5 mb-0 fw-bold text-dark">${p.employeeName}</div>
                            <div class="small text-muted font-monospace">${p.employeeCode} · ${p.departmentName} (${p.designation || 'Staff'})</div>
                            <div class="small text-muted">${p.email || ''}</div>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <div class="small text-muted text-uppercase fw-bold" style="font-size:0.7rem;">Net Take-Home Salary</div>
                            <div class="h2 mb-0 fw-bold font-monospace" style="color:#0891b2;">${this.fmt(net)}</div>
                            <span class="badge ${p.paymentStatus === 'PAID' ? 'bg-success' : 'bg-primary'} font-monospace">${p.paymentStatus || 'PROCESSED'}</span>
                        </div>
                    </div>

                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="p-3 rounded-3" style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2);">
                                <div class="fw-bold text-success text-uppercase mb-2" style="font-size:0.75rem; letter-spacing:0.04em;">Earnings & Additions</div>
                                <div class="d-flex justify-content-between mb-2"><span>Basic Salary</span><strong class="font-monospace">${this.fmt(basic)}</strong></div>
                                <div class="d-flex justify-content-between mb-2"><span>Allowances (Housing/Travel)</span><strong class="font-monospace text-success">+${this.fmt(allowances)}</strong></div>
                                <div class="d-flex justify-content-between mb-2"><span>Overtime Payout (DB Verified)</span><strong class="font-monospace" style="color:#7e22ce;">+${this.fmt(ot)}</strong></div>
                                <div class="d-flex justify-content-between pt-2 border-top border-success-subtle">
                                    <strong class="text-dark">Gross Earnings</strong>
                                    <strong class="font-monospace text-success fs-6">${this.fmt(basic + allowances + ot)}</strong>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="p-3 rounded-3" style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2);">
                                <div class="fw-bold text-danger text-uppercase mb-2" style="font-size:0.75rem; letter-spacing:0.04em;">Statutory Deductions</div>
                                <div class="d-flex justify-content-between mb-2"><span>EPF (Employee 8%)</span><strong class="font-monospace text-danger">-${this.fmt(epf)}</strong></div>
                                <div class="d-flex justify-content-between mb-2"><span>APIT / PAYE Tax</span><strong class="font-monospace text-danger">-${this.fmt(tax)}</strong></div>
                                <div class="d-flex justify-content-between mb-2"><span>ETF (Company 3% Contrib.)</span><span class="text-muted font-monospace">${this.fmt(basic * 0.03)}</span></div>
                                <div class="d-flex justify-content-between pt-2 border-top border-danger-subtle">
                                    <strong class="text-dark">Total Deductions</strong>
                                    <strong class="font-monospace text-danger fs-6">-${this.fmt(deductions)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 p-3 rounded-3 d-flex justify-content-between align-items-center" style="background:#f1f5f9; border:1px solid #cbd5e1;">
                        <span class="small text-muted font-monospace">Remittance Officer: Payroll Controller | Generated: ${new Date().toLocaleDateString('en-GB')}</span>
                        <div class="small text-muted font-monospace">Bank Ref: WO-PR-${p.id || 101}</div>
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('payslipModal'));
        modal.show();
    }

    async markAsPaid(id) {
        try {
            await ApiClient.put(`/payroll/${id}/status?status=PAID`);
            WorkOps.showToast('success', `Payroll record #${id} marked as PAID.`);
            await this.loadSalaryRecords();
        } catch (e) {
            WorkOps.showToast('error', e.message || 'Failed to update status');
        }
    }

    // =========================================================================
    // 5. Event Management (ඉවෙන්ට් සහ දින දර්ශනය)
    // =========================================================================
    async loadEvents() {
        const container = document.getElementById('payroll-events-container');
        if (!container) return;

        try {
            const res = await ApiClient.get('/payroll/events');
            this.events = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            this.renderEvents(this.events);
        } catch (e) {
            console.error('Error loading events:', e);
        }
    }

    renderEvents(events) {
        const container = document.getElementById('payroll-events-container');
        if (!container) return;

        if (!events.length) {
            container.innerHTML = `<div class="p-4 text-center text-muted">No scheduled payroll events. Click "+ Schedule Event" to add a deadline or reminder.</div>`;
            return;
        }

        const typeColors = {
            PAYROLL_CUTOFF: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: 'fa-calendar-xmark' },
            SALARY_PAYOUT: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: 'fa-money-bill-transfer' },
            TAX_FILING: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: 'fa-file-invoice-dollar' },
            BONUS_PAY: { bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe', icon: 'fa-award' },
            HOLIDAY: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', icon: 'fa-champagne-glasses' }
        };

        container.innerHTML = events.map(ev => {
            const style = typeColors[ev.eventType] || typeColors.PAYROLL_CUTOFF;
            return `
                <div class="p-3 mb-3 rounded-3 border d-flex justify-content-between align-items-center" style="background:${style.bg}; border-color:${style.border} !important;">
                    <div class="d-flex align-items-center gap-3">
                        <div style="width:40px; height:40px; border-radius:10px; background:${style.color}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">
                            <i class="fa-solid ${style.icon}"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-dark">${ev.title}</div>
                            <div class="small text-muted">${ev.description || 'No description added'}</div>
                            <div class="small font-monospace" style="color:${style.color}; font-size:0.75rem;">
                                <i class="fa-solid fa-clock me-1"></i> Target Date: ${ev.eventDate} · Priority: ${ev.priority || 'MEDIUM'}
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" title="Delete event" onclick="window.payrollModule.deleteEvent(${ev.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    async handleCreateEvent(e) {
        e.preventDefault();
        const payload = {
            title: document.getElementById('event-title')?.value || 'Payroll Event',
            eventType: document.getElementById('event-type')?.value || 'PAYROLL_CUTOFF',
            eventDate: document.getElementById('event-date')?.value || new Date().toISOString().split('T')[0],
            priority: document.getElementById('event-priority')?.value || 'MEDIUM',
            description: document.getElementById('event-desc')?.value || ''
        };

        try {
            await ApiClient.post('/payroll/events', payload);
            WorkOps.showToast('success', 'New payroll event scheduled and saved to database.');
            const modal = bootstrap.Modal.getInstance(document.getElementById('createEventModal'));
            if (modal) modal.hide();
            await this.loadEvents();
        } catch (error) {
            WorkOps.showToast('error', error.message || 'Failed to create event');
        }
    }

    async deleteEvent(id) {
        try {
            await ApiClient.delete(`/payroll/events/${id}`);
            WorkOps.showToast('success', 'Event removed.');
            await this.loadEvents();
        } catch (e) {
            WorkOps.showToast('error', e.message || 'Could not delete event');
        }
    }

    // =========================================================================
    // Exports
    // =========================================================================
    exportSalaryCSV() {
        if (!this.records.length) {
            WorkOps.showToast('warning', 'No salary records available to export.');
            return;
        }
        const fileName = `workops_payroll_records_${this.currentMonth}_${this.currentYear}.csv`;
        const headers = ['Employee Code', 'Name', 'Department', 'Designation', 'Basic Salary', 'Allowances', 'Overtime Pay', 'Deductions', 'Net Salary', 'Status'];
        const rows = this.records.map(r => [r.employeeCode, r.employeeName, r.departmentName, r.designation, r.basicSalary, r.allowances, r.overtimePay, r.deductions, r.netSalary, r.paymentStatus].map(v => `"${v || ''}"`).join(','));
        const link = document.createElement('a');
        link.href = encodeURI(`data:text/csv;charset=utf-8,${[headers.join(','), ...rows].join('\n')}`);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        WorkOps.showToast('success', 'Payroll CSV exported successfully.');
    }

    exportSalaryPDF() {
        window.print();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.payrollModule = new PayrollController();
});
