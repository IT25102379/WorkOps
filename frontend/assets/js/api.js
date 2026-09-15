/**
 * WorkOps Centralized API Client & HTTP Interceptor
 * Handles JWT Authorization Headers, REST calls & Smart Offline Fallback
 */

const API_BASE_URL = 'http://localhost:8080/api/v1';

// Seed Fallback Dataset for Standalone Client-Side Execution / Demo
const MOCK_STORAGE_KEY = 'workops_mock_data';

function initializeMockData() {
    if (!localStorage.getItem(MOCK_STORAGE_KEY)) {
        const initialMock = {
            todayStatus: {
                isClockedIn: false,
                isClockedOut: false,
                clockInTime: null,
                clockOutTime: null,
                elapsedSeconds: 0,
                elapsedFormatted: '00h 00m 00s',
                shiftStartTime: '08:30',
                shiftEndTime: '17:30',
                gracePeriodMinutes: 15,
                currentStatus: 'NOT_CLOCKED_IN',
                isGeofenceVerified: false,
                officeLatitude: 6.927079,
                officeLongitude: 79.861244,
                officeRadiusMeters: 350
            },
            kpis: {
                totalEmployees: 48,
                totalPresentToday: 42,
                lateArrivalsCount: 4,
                onTimeCount: 38,
                onTimePercentage: 90.5,
                totalOvertimeHours: 18.5,
                halfDayCount: 1,
                absentCount: 6,
                pendingCorrectionRequests: 2
            },
            records: [
                {
                    id: 101,
                    employeeCode: 'EMP-004',
                    employeeName: 'John Doe',
                    departmentName: 'Engineering & Technology',
                    designation: 'Senior Full Stack Engineer',
                    attendanceDate: new Date().toISOString().split('T')[0],
                    clockInTime: new Date().toISOString().split('T')[0] + ' 08:24:12',
                    clockOutTime: null,
                    workDurationMinutes: 0,
                    lateMinutes: 0,
                    overtimeMinutes: 0,
                    earlyDepartureMinutes: 0,
                    status: 'PRESENT',
                    isGeofenceVerified: true,
                    clockInIp: '192.168.1.45',
                    remarks: 'On-time clock-in via Web Portal'
                },
                {
                    id: 102,
                    employeeCode: 'EMP-005',
                    employeeName: 'Emma Watson',
                    departmentName: 'Marketing & Sales',
                    designation: 'Growth Marketing Specialist',
                    attendanceDate: new Date().toISOString().split('T')[0],
                    clockInTime: new Date().toISOString().split('T')[0] + ' 09:22:15',
                    clockOutTime: null,
                    workDurationMinutes: 0,
                    lateMinutes: 22,
                    overtimeMinutes: 0,
                    earlyDepartureMinutes: 0,
                    status: 'LATE_ARRIVAL',
                    isGeofenceVerified: true,
                    clockInIp: '192.168.1.72',
                    remarks: 'Traffic congestion on bridge'
                },
                {
                    id: 103,
                    employeeCode: 'EMP-003',
                    employeeName: 'Alex Cross',
                    departmentName: 'Engineering & Technology',
                    designation: 'Engineering Manager',
                    attendanceDate: new Date().toISOString().split('T')[0],
                    clockInTime: new Date().toISOString().split('T')[0] + ' 08:15:00',
                    clockOutTime: null,
                    workDurationMinutes: 0,
                    lateMinutes: 0,
                    overtimeMinutes: 0,
                    earlyDepartureMinutes: 0,
                    status: 'PRESENT',
                    isGeofenceVerified: true,
                    clockInIp: '192.168.1.12',
                    remarks: 'Standard shift check-in'
                },
                {
                    id: 104,
                    employeeCode: 'EMP-002',
                    employeeName: 'Sarah Connor',
                    departmentName: 'Human Resources',
                    designation: 'Head of Human Resources',
                    attendanceDate: new Date().toISOString().split('T')[0],
                    clockInTime: new Date().toISOString().split('T')[0] + ' 08:28:45',
                    clockOutTime: null,
                    workDurationMinutes: 0,
                    lateMinutes: 0,
                    overtimeMinutes: 0,
                    earlyDepartureMinutes: 0,
                    status: 'PRESENT',
                    isGeofenceVerified: true,
                    clockInIp: '192.168.1.20',
                    remarks: 'HR check-in completed'
                },
                {
                    id: 105,
                    employeeCode: 'EMP-006',
                    employeeName: 'Payroll Officer',
                    departmentName: 'Finance & Accounting',
                    designation: 'Payroll Controller',
                    attendanceDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                    clockInTime: new Date(Date.now() - 86400000).toISOString().split('T')[0] + ' 08:25:00',
                    clockOutTime: new Date(Date.now() - 86400000).toISOString().split('T')[0] + ' 18:45:00',
                    workDurationMinutes: 620,
                    lateMinutes: 0,
                    overtimeMinutes: 75,
                    earlyDepartureMinutes: 0,
                    status: 'OVERTIME',
                    isGeofenceVerified: true,
                    clockInIp: '192.168.1.88',
                    remarks: 'Payroll closing overtime'
                }
            ],
            corrections: [
                {
                    id: 1,
                    employeeCode: 'EMP-005',
                    employeeName: 'Emma Watson',
                    departmentName: 'Marketing & Sales',
                    requestType: 'TIME_CORRECTION',
                    requestedDate: new Date().toISOString().split('T')[0],
                    requestedClockIn: new Date().toISOString().split('T')[0] + ' 08:30:00',
                    reason: 'Badge scanner timeout at lobby checkpoint',
                    status: 'PENDING',
                    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
                }
            ],
            overtime: [
                {
                    id: 1,
                    employeeId: 1,
                    employeeCode: 'EMP-004',
                    employeeName: 'John Doe',
                    departmentName: 'Engineering & Technology',
                    otDate: new Date().toISOString().split('T')[0],
                    startTime: '17:30',
                    endTime: '20:30',
                    otHours: 3.0,
                    multiplierRate: 1.5,
                    taskDescription: 'Q3 Release Backend Migration & Performance Profiling',
                    reason: 'Critical server deployment deadline',
                    status: 'APPROVED',
                    createdBy: 'HR Manager',
                    approvedBy: 'HR Manager',
                    approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
                },
                {
                    id: 2,
                    employeeId: 2,
                    employeeCode: 'EMP-005',
                    employeeName: 'Emma Watson',
                    departmentName: 'Marketing & Sales',
                    otDate: new Date().toISOString().split('T')[0],
                    startTime: '18:00',
                    endTime: '20:00',
                    otHours: 2.0,
                    multiplierRate: 1.5,
                    taskDescription: 'International Campaign Launch Preparations',
                    reason: 'Urgent client creative assets delivery',
                    status: 'PENDING',
                    createdBy: 'HR Manager',
                    approvedBy: null,
                    approvedAt: null,
                    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
                }
            ]
        };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initialMock));
    }
}

initializeMockData();

function getMockDB() {
    return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY));
}

function saveMockDB(data) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
}

export const ApiClient = {
    getToken() {
        return localStorage.getItem('workops_token');
    },

    setToken(token) {
        localStorage.setItem('workops_token', token);
    },

    removeToken() {
        localStorage.removeItem('workops_token');
        localStorage.removeItem('workops_user');
    },

    getCurrentUser() {
        const userStr = localStorage.getItem('workops_user');
        if (userStr) {
            try { return JSON.parse(userStr); } catch (e) { return null; }
        }
        return {
            username: 'john.doe',
            fullName: 'John Doe',
            designation: 'Senior Full Stack Engineer',
            departmentName: 'Engineering & Technology',
            role: 'ROLE_ADMIN'
        };
    },

    async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s connection timeout for fallback

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
                signal: controller.signal
            });
            const json = await response.json();
            if (!response.ok) {
                let errorMsg = json.message || `Request failed with status ${response.status}`;
                if (json.data && typeof json.data === 'object' && Object.keys(json.data).length > 0) {
                    const fieldErrors = Object.entries(json.data).map(([field, msg]) => `• ${msg || field}`).join('\n');
                    errorMsg = `${json.message || 'Validation failed'}:\n${fieldErrors}`;
                }
                const err = new Error(errorMsg);
                err.status = response.status;
                err.validationErrors = json.data;
                throw err;
            }
            return json;
        } catch (error) {
            if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 422 || endpoint.startsWith('/auth/')) {
                throw error;
            }
            console.warn(`[WorkOps API] Backend offline or network error (${endpoint}). Running in seamless client fallback mode.`, error.message);
            return this.handleMockFallback(endpoint, options);
        }
    },

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(fullUrl, { method: 'GET' });
    },

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    },

    // Intelligent Mock Fallback Engine
    async handleMockFallback(endpoint, options) {
        const mockDB = getMockDB();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Clock-in endpoint
        if (endpoint === '/attendance/clock-in' && options.method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const clockInTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);
            
            // Shift calculations (08:30 start + 15 min grace = 08:45)
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const isLate = (hours > 8 || (hours === 8 && minutes > 45));
            const lateMins = isLate ? Math.max(0, (hours * 60 + minutes) - (8 * 60 + 30)) : 0;
            const status = isLate ? 'LATE_ARRIVAL' : 'PRESENT';

            mockDB.todayStatus = {
                ...mockDB.todayStatus,
                isClockedIn: true,
                clockedIn: true,
                isClockedOut: false,
                clockedOut: false,
                clockInTime: clockInTimeStr,
                currentStatus: status,
                isGeofenceVerified: true,
                elapsedSeconds: 1
            };

            const newRecord = {
                id: Date.now(),
                employeeCode: 'EMP-004',
                employeeName: 'John Doe',
                departmentName: 'Engineering & Technology',
                designation: 'Senior Full Stack Engineer',
                attendanceDate: todayStr,
                clockInTime: clockInTimeStr,
                clockOutTime: null,
                workDurationMinutes: 0,
                lateMinutes: lateMins,
                overtimeMinutes: 0,
                earlyDepartureMinutes: 0,
                status: status,
                isGeofenceVerified: true,
                clockInIp: '192.168.1.45 (Local)',
                remarks: body.remarks || 'Clocked in via WorkOps Web Portal'
            };

            mockDB.records.unshift(newRecord);
            mockDB.kpis.totalPresentToday++;
            if (isLate) mockDB.kpis.lateArrivalsCount++;
            saveMockDB(mockDB);

            return { success: true, message: 'Clock-in recorded successfully (Client Mode)', data: newRecord };
        }

        // 2. Clock-out endpoint
        if (endpoint === '/attendance/clock-out' && options.method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const clockOutTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);

            mockDB.todayStatus.isClockedOut = true;
            mockDB.todayStatus.clockedOut = true;
            mockDB.todayStatus.clockOutTime = clockOutTimeStr;

            const existing = mockDB.records.find(r => r.attendanceDate === todayStr && r.employeeCode === 'EMP-004');
            if (existing) {
                existing.clockOutTime = clockOutTimeStr;
                existing.workDurationMinutes = 495; // ~8h 15m
                existing.overtimeMinutes = 15;
                if (existing.status !== 'LATE_ARRIVAL') {
                    existing.status = 'OVERTIME';
                }
                if (body.remarks) existing.remarks += ' | Clock-out: ' + body.remarks;
            }
            mockDB.kpis.totalOvertimeHours += 0.25;
            saveMockDB(mockDB);

            return { success: true, message: 'Clock-out recorded successfully (Client Mode)', data: existing };
        }

        // 3. Today's Status
        if (endpoint.startsWith('/attendance/status/today')) {
            return { success: true, data: mockDB.todayStatus };
        }

        // 4. KPIs
        if (endpoint.startsWith('/attendance/kpis')) {
            return { success: true, data: mockDB.kpis };
        }

        // 5. Records Filter
        if (endpoint.startsWith('/attendance/records')) {
            return { success: true, data: mockDB.records };
        }

        // 6. Correction Requests
        if (endpoint.startsWith('/attendance/corrections') && options.method === 'GET') {
            return { success: true, data: mockDB.corrections };
        }

        if (endpoint === '/attendance/corrections' && options.method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const newCorrection = {
                id: Date.now(),
                employeeCode: 'EMP-004',
                employeeName: 'John Doe',
                departmentName: 'Engineering & Technology',
                requestType: body.requestType || 'TIME_CORRECTION',
                requestedDate: body.requestedDate || todayStr,
                requestedClockIn: body.requestedClockIn,
                requestedClockOut: body.requestedClockOut,
                reason: body.reason || 'Manual Correction Request',
                status: 'PENDING',
                createdAt: now.toISOString().replace('T', ' ').substring(0, 19)
            };
            mockDB.corrections.unshift(newCorrection);
            mockDB.kpis.pendingCorrectionRequests++;
            saveMockDB(mockDB);
            return { success: true, message: 'Correction request submitted (Client Mode)', data: newCorrection };
        }

        // 7. Review Correction
        if (endpoint.includes('/review') && options.method === 'PUT') {
            const body = JSON.parse(options.body || '{}');
            const idMatch = endpoint.match(/\/corrections\/(\d+)\/review/);
            const reqId = idMatch ? parseInt(idMatch[1]) : null;
            const target = mockDB.corrections.find(c => c.id === reqId);
            if (target) {
                target.status = body.status;
                target.reviewedByName = 'Admin';
                target.reviewComment = body.reviewComment;
                target.reviewedAt = now.toISOString().replace('T', ' ').substring(0, 19);
                mockDB.kpis.pendingCorrectionRequests = Math.max(0, mockDB.kpis.pendingCorrectionRequests - 1);
                saveMockDB(mockDB);
            }
            return { success: true, message: 'Correction request reviewed', data: target };
        }

        // 8. Log Generated Report
        if (endpoint === '/attendance/reports/log' && options.method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            if (!mockDB.generatedReports) mockDB.generatedReports = [];
            const newLog = {
                id: Date.now(),
                reportTitle: body.reportTitle || 'Attendance Management Report',
                reportType: body.reportType || 'PDF',
                module: body.module || 'ATTENDANCE',
                fileName: body.fileName || `workops_report_${todayStr}.pdf`,
                recordCount: body.recordCount || 0,
                filterCriteria: body.filterCriteria || '',
                generatedBy: body.generatedBy || 'HR Manager',
                status: 'COMPLETED',
                createdAt: now.toISOString().replace('T', ' ').substring(0, 19)
            };
            mockDB.generatedReports.unshift(newLog);
            saveMockDB(mockDB);
            return { success: true, message: 'Report generation logged in database (Client Mode)', data: newLog };
        }

        // 9. Fetch Generated Reports
        if (endpoint.startsWith('/attendance/reports/logs') && options.method === 'GET') {
            return { success: true, data: mockDB.generatedReports || [] };
        }

        // 10. Overtime (OT) - Create Request
        if (endpoint === '/overtime' && options.method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            if (!mockDB.overtime) mockDB.overtime = [];
            
            const startH = body.startTime ? parseFloat(body.startTime.split(':')[0]) + parseFloat(body.startTime.split(':')[1] || 0) / 60 : 17.5;
            const endH = body.endTime ? parseFloat(body.endTime.split(':')[0]) + parseFloat(body.endTime.split(':')[1] || 0) / 60 : 20.5;
            const diffH = (endH > startH) ? (endH - startH) : (24 - startH + endH);
            const calculatedHours = body.otHours || Math.round(diffH * 100) / 100 || 2.0;

            const newOt = {
                id: Date.now(),
                employeeId: body.employeeId || 1,
                employeeCode: body.employeeCode || 'EMP-004',
                employeeName: body.employeeName || 'John Doe',
                departmentName: body.departmentName || 'Engineering & Technology',
                otDate: body.otDate || todayStr,
                startTime: body.startTime || '17:30',
                endTime: body.endTime || '20:30',
                otHours: calculatedHours,
                multiplierRate: body.multiplierRate || 1.5,
                taskDescription: body.taskDescription || 'General Overtime Work',
                reason: body.reason || 'Project Delivery Milestone',
                status: (body.status || 'PENDING').toUpperCase(),
                createdBy: body.createdBy || 'HR Manager',
                approvedBy: (body.status === 'APPROVED') ? 'HR Manager' : null,
                approvedAt: (body.status === 'APPROVED') ? now.toISOString().replace('T', ' ').substring(0, 19) : null,
                createdAt: now.toISOString().replace('T', ' ').substring(0, 19),
                updatedAt: now.toISOString().replace('T', ' ').substring(0, 19)
            };

            mockDB.overtime.unshift(newOt);
            saveMockDB(mockDB);
            return { success: true, message: 'Overtime request created successfully (Client Mode)', data: newOt };
        }

        // 10b. Get Employees for Dropdown
        if ((endpoint.includes('/overtime/employees') || endpoint === '/employees') && options.method === 'GET') {
            return {
                success: true,
                data: [
                    { id: 1, employeeCode: 'EMP-001', fullName: 'System Administrator', departmentName: 'Engineering & Technology', designation: 'Chief Technology Officer' },
                    { id: 2, employeeCode: 'EMP-002', fullName: 'Sarah Connor', departmentName: 'Human Resources', designation: 'Head of Human Resources' },
                    { id: 3, employeeCode: 'EMP-003', fullName: 'Alex Cross', departmentName: 'Engineering & Technology', designation: 'Engineering Manager' },
                    { id: 4, employeeCode: 'EMP-004', fullName: 'John Doe', departmentName: 'Engineering & Technology', designation: 'Senior Full Stack Engineer' },
                    { id: 5, employeeCode: 'EMP-005', fullName: 'Emma Watson', departmentName: 'Marketing & Sales', designation: 'Growth Marketing Specialist' },
                    { id: 6, employeeCode: 'EMP-006', fullName: 'Payroll Officer', departmentName: 'Finance & Accounting', designation: 'Payroll Controller' }
                ]
            };
        }

        // 11. Overtime (OT) - Read All / Filter
        if (endpoint.startsWith('/overtime') && options.method === 'GET') {
            if (!mockDB.overtime) mockDB.overtime = [];
            if (endpoint.includes('/my')) {
                return { success: true, data: mockDB.overtime };
            }
            const idMatch = endpoint.match(/\/overtime\/(\d+)$/);
            if (idMatch) {
                const single = mockDB.overtime.find(o => o.id === parseInt(idMatch[1]));
                return single ? { success: true, data: single } : { success: false, message: 'Not found' };
            }
            return { success: true, data: mockDB.overtime };
        }

        // 12. Overtime (OT) - Update Status (Approve / Reject)
        if (endpoint.includes('/overtime/') && endpoint.includes('/status') && options.method === 'PUT') {
            const body = JSON.parse(options.body || '{}');
            const idMatch = endpoint.match(/\/overtime\/(\d+)\/status/);
            const otId = idMatch ? parseInt(idMatch[1]) : null;
            const target = (mockDB.overtime || []).find(o => o.id === otId);
            if (target) {
                target.status = (body.status || 'APPROVED').toUpperCase();
                target.approvedBy = 'HR Manager';
                target.approvedAt = now.toISOString().replace('T', ' ').substring(0, 19);
                target.updatedAt = now.toISOString().replace('T', ' ').substring(0, 19);
                if (body.reviewComment) {
                    target.reason = (target.reason || '') + ' [Review: ' + body.reviewComment + ']';
                }
                saveMockDB(mockDB);
            }
            return { success: true, message: `Overtime marked as ${target?.status}`, data: target };
        }

        // 13. Overtime (OT) - Update Details (Edit Form)
        if (endpoint.match(/\/overtime\/\d+$/) && options.method === 'PUT') {
            const body = JSON.parse(options.body || '{}');
            const idMatch = endpoint.match(/\/overtime\/(\d+)$/);
            const otId = idMatch ? parseInt(idMatch[1]) : null;
            const target = (mockDB.overtime || []).find(o => o.id === otId);
            if (target) {
                if (body.employeeName) target.employeeName = body.employeeName;
                if (body.employeeCode) target.employeeCode = body.employeeCode;
                if (body.departmentName) target.departmentName = body.departmentName;
                if (body.otDate) target.otDate = body.otDate;
                if (body.startTime) target.startTime = body.startTime;
                if (body.endTime) target.endTime = body.endTime;
                if (body.otHours) target.otHours = body.otHours;
                if (body.multiplierRate) target.multiplierRate = body.multiplierRate;
                if (body.taskDescription) target.taskDescription = body.taskDescription;
                if (body.reason) target.reason = body.reason;
                if (body.status) target.status = body.status.toUpperCase();
                target.updatedAt = now.toISOString().replace('T', ' ').substring(0, 19);
                saveMockDB(mockDB);
            }
            return { success: true, message: 'Overtime record updated', data: target };
        }

        // 14. Overtime (OT) - Delete Record
        if (endpoint.match(/\/overtime\/\d+$/) && options.method === 'DELETE') {
            const idMatch = endpoint.match(/\/overtime\/(\d+)$/);
            const otId = idMatch ? parseInt(idMatch[1]) : null;
            mockDB.overtime = (mockDB.overtime || []).filter(o => o.id !== otId);
            saveMockDB(mockDB);
            return { success: true, message: 'Overtime record deleted successfully' };
        }

        // Default mock response
        return { success: true, message: 'Mock response', data: [] };
    }
};
