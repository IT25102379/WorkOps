-- ============================================================================
-- STAFF MANAGEMENT SYSTEM (WorkOps) - LEAVE MANAGEMENT MODULE
-- Database Script for Microsoft SQL Server (SSMS)
-- Target Database: StaffManagementDB
-- Compatible with: Spring Boot JPA / Hibernate Entities
-- ============================================================================

-- 1. DATABASE CREATION (If not already created)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'StaffManagementDB')
BEGIN
    CREATE DATABASE StaffManagementDB;
    PRINT 'Database StaffManagementDB created successfully.';
END
ELSE
BEGIN
    PRINT 'Database StaffManagementDB already exists.';
END
GO

USE StaffManagementDB;
GO

-- ============================================================================
-- 2. DROP TABLES IN REVERSE DEPENDENCY ORDER (For clean re-runs)
-- ============================================================================
IF OBJECT_ID(N'dbo.LEAVE_APPROVAL', N'U') IS NOT NULL DROP TABLE dbo.LEAVE_APPROVAL;
IF OBJECT_ID(N'dbo.LEAVE_BALANCE', N'U') IS NOT NULL DROP TABLE dbo.LEAVE_BALANCE;
IF OBJECT_ID(N'dbo.LEAVE_REQUEST', N'U') IS NOT NULL DROP TABLE dbo.LEAVE_REQUEST;
IF OBJECT_ID(N'dbo.LEAVE_TYPE', N'U') IS NOT NULL DROP TABLE dbo.LEAVE_TYPE;
IF OBJECT_ID(N'dbo.EMPLOYEE', N'U') IS NOT NULL DROP TABLE dbo.EMPLOYEE;
GO

-- ============================================================================
-- 3. TABLE CREATION
-- ============================================================================

-- Table 1: EMPLOYEE (Core Shared Master Table)
CREATE TABLE dbo.EMPLOYEE (
    employee_id BIGINT IDENTITY(1,1) NOT NULL,
    first_name  NVARCHAR(255) NOT NULL,
    last_name   NVARCHAR(255) NOT NULL,
    email       NVARCHAR(255) NOT NULL,
    department  NVARCHAR(255) NULL,
    role        NVARCHAR(50)  NOT NULL, -- 'EMPLOYEE', 'MANAGER', 'HR_OFFICER'
    status      NVARCHAR(50)  DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'

    CONSTRAINT PK_EMPLOYEE PRIMARY KEY CLUSTERED (employee_id ASC),
    CONSTRAINT UQ_EMPLOYEE_EMAIL UNIQUE (email),
    CONSTRAINT CK_EMPLOYEE_ROLE CHECK (role IN ('EMPLOYEE', 'MANAGER', 'HR_OFFICER'))
);
GO

-- Table 2: LEAVE_TYPE (Leave Module Master Table)
CREATE TABLE dbo.LEAVE_TYPE (
    leave_type_id   BIGINT IDENTITY(1,1) NOT NULL,
    leave_type_name NVARCHAR(255) NOT NULL,
    default_days    INT NOT NULL DEFAULT 0,
    description     NVARCHAR(500) NULL,
    active          BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_LEAVE_TYPE PRIMARY KEY CLUSTERED (leave_type_id ASC),
    CONSTRAINT UQ_LEAVE_TYPE_NAME UNIQUE (leave_type_name),
    CONSTRAINT CK_LEAVE_TYPE_DAYS CHECK (default_days >= 0)
);
GO

-- Table 3: LEAVE_REQUEST (Core Transactional Table for Leave Applications)
CREATE TABLE dbo.LEAVE_REQUEST (
    leave_request_id    BIGINT IDENTITY(1,1) NOT NULL,
    employee_id         BIGINT NOT NULL,
    leave_type_id       BIGINT NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    number_of_days      INT NOT NULL,
    reason              NVARCHAR(1000) NOT NULL,
    supporting_document NVARCHAR(500) NULL,
    status              NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
    applied_date        DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    approved_by         BIGINT NULL,
    approved_date       DATETIME2(6) NULL,
    manager_comment     NVARCHAR(1000) NULL,
    created_at          DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(6) NULL,

    CONSTRAINT PK_LEAVE_REQUEST PRIMARY KEY CLUSTERED (leave_request_id ASC),
    CONSTRAINT FK_LEAVE_REQUEST_EMPLOYEE FOREIGN KEY (employee_id)
        REFERENCES dbo.EMPLOYEE(employee_id) ON DELETE NO ACTION,
    CONSTRAINT FK_LEAVE_REQUEST_LEAVE_TYPE FOREIGN KEY (leave_type_id)
        REFERENCES dbo.LEAVE_TYPE(leave_type_id) ON DELETE NO ACTION,
    CONSTRAINT FK_LEAVE_REQUEST_APPROVER FOREIGN KEY (approved_by)
        REFERENCES dbo.EMPLOYEE(employee_id) ON DELETE NO ACTION,
    CONSTRAINT CK_LEAVE_REQUEST_DATES CHECK (end_date >= start_date),
    CONSTRAINT CK_LEAVE_REQUEST_DAYS CHECK (number_of_days > 0),
    CONSTRAINT CK_LEAVE_REQUEST_STATUS CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);
GO

-- Table 4: LEAVE_APPROVAL (Audit Trail / History)
CREATE TABLE dbo.LEAVE_APPROVAL (
    approval_id         BIGINT IDENTITY(1,1) NOT NULL,
    leave_request_id    BIGINT NOT NULL,
    approver_id         BIGINT NOT NULL,
    action              NVARCHAR(50) NOT NULL,
    comment             NVARCHAR(1000) NULL,
    decision_date       DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_LEAVE_APPROVAL PRIMARY KEY CLUSTERED (approval_id ASC),
    CONSTRAINT FK_LEAVE_APPROVAL_REQUEST FOREIGN KEY (leave_request_id)
        REFERENCES dbo.LEAVE_REQUEST(leave_request_id) ON DELETE CASCADE,
    CONSTRAINT FK_LEAVE_APPROVAL_APPROVER FOREIGN KEY (approver_id)
        REFERENCES dbo.EMPLOYEE(employee_id) ON DELETE NO ACTION,
    CONSTRAINT CK_LEAVE_APPROVAL_ACTION CHECK (action IN ('APPROVED', 'REJECTED'))
);
GO

-- Table 5: LEAVE_BALANCE (Quota per Employee per Year)
CREATE TABLE dbo.LEAVE_BALANCE (
    leave_balance_id    BIGINT IDENTITY(1,1) NOT NULL,
    employee_id         BIGINT NOT NULL,
    leave_type_id       BIGINT NOT NULL,
    year                INT NOT NULL,
    allocated_days      INT NOT NULL DEFAULT 0,
    used_days           INT NOT NULL DEFAULT 0,
    remaining_days      INT NOT NULL DEFAULT 0,

    CONSTRAINT PK_LEAVE_BALANCE PRIMARY KEY CLUSTERED (leave_balance_id ASC),
    CONSTRAINT FK_LEAVE_BALANCE_EMPLOYEE FOREIGN KEY (employee_id)
        REFERENCES dbo.EMPLOYEE(employee_id) ON DELETE CASCADE,
    CONSTRAINT FK_LEAVE_BALANCE_LEAVE_TYPE FOREIGN KEY (leave_type_id)
        REFERENCES dbo.LEAVE_TYPE(leave_type_id) ON DELETE CASCADE,
    CONSTRAINT UQ_LEAVE_BALANCE_EMP_TYPE_YEAR UNIQUE (employee_id, leave_type_id, year),
    CONSTRAINT CK_LEAVE_BALANCE_DAYS CHECK (allocated_days >= 0 AND used_days >= 0 AND remaining_days >= 0)
);
GO

-- ============================================================================
-- 4. SAMPLE SEED DATA
-- ============================================================================
INSERT INTO dbo.EMPLOYEE (first_name, last_name, email, department, role, status) VALUES
('Alice', 'HR', 'alice.hr@example.com', 'HR', 'HR_OFFICER', 'ACTIVE'),
('Jane', 'Manager', 'jane.manager@example.com', 'IT', 'MANAGER', 'ACTIVE'),
('John', 'Doe', 'john.employee@example.com', 'IT', 'EMPLOYEE', 'ACTIVE'),
('Sara', 'Smith', 'sara.employee@example.com', 'Finance', 'EMPLOYEE', 'ACTIVE');
GO

INSERT INTO dbo.LEAVE_TYPE (leave_type_name, default_days, description, active) VALUES
('Annual Leave', 14, 'Standard paid annual leave', 1),
('Sick Leave', 7, 'Medical emergency leave', 1),
('Casual Leave', 5, 'Short urgent personal leave', 1),
('Unpaid Leave', 0, 'Leave without pay', 1);
GO

-- Balances for 2026
INSERT INTO dbo.LEAVE_BALANCE (employee_id, leave_type_id, [year], allocated_days, used_days, remaining_days)
SELECT 1, leave_type_id, 2026, default_days, 0, default_days FROM dbo.LEAVE_TYPE WHERE leave_type_name != 'Unpaid Leave';

INSERT INTO dbo.LEAVE_BALANCE (employee_id, leave_type_id, [year], allocated_days, used_days, remaining_days)
SELECT 2, leave_type_id, 2026, default_days, 0, default_days FROM dbo.LEAVE_TYPE WHERE leave_type_name != 'Unpaid Leave';

INSERT INTO dbo.LEAVE_BALANCE (employee_id, leave_type_id, [year], allocated_days, used_days, remaining_days)
SELECT 3, leave_type_id, 2026, default_days, 0, default_days FROM dbo.LEAVE_TYPE WHERE leave_type_name != 'Unpaid Leave';

INSERT INTO dbo.LEAVE_BALANCE (employee_id, leave_type_id, [year], allocated_days, used_days, remaining_days)
SELECT 4, leave_type_id, 2026, default_days, 0, default_days FROM dbo.LEAVE_TYPE WHERE leave_type_name != 'Unpaid Leave';
GO

-- Sample Requests
-- 1. Pending (John Doe)
INSERT INTO dbo.LEAVE_REQUEST (employee_id, leave_type_id, start_date, end_date, number_of_days, reason, status)
VALUES (3, 1, '2026-10-01', '2026-10-03', 3, 'Family trip to Kandy', 'PENDING');

-- 2. Approved (Sara Smith)
INSERT INTO dbo.LEAVE_REQUEST (employee_id, leave_type_id, start_date, end_date, number_of_days, reason, status, applied_date, approved_by, approved_date, manager_comment)
VALUES (4, 2, '2026-08-10', '2026-08-11', 2, 'Severe fever and doctor appointment', 'APPROVED', '2026-08-09', 2, '2026-08-09', 'Get well soon. Approved.');

UPDATE dbo.LEAVE_BALANCE
SET used_days = used_days + 2, remaining_days = remaining_days - 2
WHERE employee_id = 4 AND leave_type_id = 2 AND [year] = 2026;

INSERT INTO dbo.LEAVE_APPROVAL (leave_request_id, approver_id, action, comment, decision_date)
VALUES (2, 2, 'APPROVED', 'Get well soon. Approved.', '2026-08-09');

-- 3. Rejected (John Doe)
INSERT INTO dbo.LEAVE_REQUEST (employee_id, leave_type_id, start_date, end_date, number_of_days, reason, status, applied_date, approved_by, approved_date, manager_comment)
VALUES (3, 1, '2026-07-01', '2026-07-05', 5, 'Personal holiday', 'REJECTED', '2026-06-25', 2, '2026-06-26', 'Sprint release week. Cannot approve vacation.');

INSERT INTO dbo.LEAVE_APPROVAL (leave_request_id, approver_id, action, comment, decision_date)
VALUES (3, 2, 'REJECTED', 'Sprint release week. Cannot approve vacation.', '2026-06-26');

-- 4. Pending Manager Request (Jane Manager) -> Only HR can approve
INSERT INTO dbo.LEAVE_REQUEST (employee_id, leave_type_id, start_date, end_date, number_of_days, reason, status, applied_date)
VALUES (2, 1, '2026-11-15', '2026-11-18', 4, 'Annual vacation with family', 'PENDING', SYSUTCDATETIME());
GO

-- ============================================================================
-- 5. USEFUL QUERIES
-- ============================================================================

-- Query 1: All Leave Requests with Details
SELECT 
    lr.leave_request_id,
    emp.first_name + ' ' + emp.last_name AS employee_name,
    emp.department,
    emp.role AS employee_role,
    lt.leave_type_name,
    lr.start_date,
    lr.end_date,
    lr.number_of_days,
    lr.reason,
    lr.status,
    lr.applied_date,
    appr.first_name + ' ' + appr.last_name AS reviewed_by,
    lr.manager_comment
FROM dbo.LEAVE_REQUEST lr
INNER JOIN dbo.EMPLOYEE emp ON lr.employee_id = emp.employee_id
INNER JOIN dbo.LEAVE_TYPE lt ON lr.leave_type_id = lt.leave_type_id
LEFT JOIN dbo.EMPLOYEE appr ON lr.approved_by = appr.employee_id
ORDER BY lr.applied_date DESC;
GO

-- Query 2: Pending Requests
SELECT 
    lr.leave_request_id,
    emp.first_name + ' ' + emp.last_name AS employee_name,
    emp.department,
    lt.leave_type_name,
    lr.start_date,
    lr.end_date,
    lr.number_of_days,
    lr.reason,
    lr.applied_date
FROM dbo.LEAVE_REQUEST lr
INNER JOIN dbo.EMPLOYEE emp ON lr.employee_id = emp.employee_id
INNER JOIN dbo.LEAVE_TYPE lt ON lr.leave_type_id = lt.leave_type_id
WHERE lr.status = 'PENDING'
ORDER BY lr.applied_date ASC;
GO

-- Query 3: Approved Requests (For Payroll & Attendance)
SELECT 
    lr.leave_request_id,
    emp.employee_id,
    emp.first_name + ' ' + emp.last_name AS employee_name,
    emp.department,
    lt.leave_type_name,
    lr.start_date,
    lr.end_date,
    lr.number_of_days,
    lr.approved_date,
    appr.first_name + ' ' + appr.last_name AS approved_by_name
FROM dbo.LEAVE_REQUEST lr
INNER JOIN dbo.EMPLOYEE emp ON lr.employee_id = emp.employee_id
INNER JOIN dbo.LEAVE_TYPE lt ON lr.leave_type_id = lt.leave_type_id
LEFT JOIN dbo.EMPLOYEE appr ON lr.approved_by = appr.employee_id
WHERE lr.status = 'APPROVED';
GO

-- Query 4: Rejected Requests
SELECT 
    lr.leave_request_id,
    emp.first_name + ' ' + emp.last_name AS employee_name,
    lt.leave_type_name,
    lr.start_date,
    lr.end_date,
    lr.number_of_days,
    lr.manager_comment AS rejection_reason,
    appr.first_name + ' ' + appr.last_name AS rejected_by_name
FROM dbo.LEAVE_REQUEST lr
INNER JOIN dbo.EMPLOYEE emp ON lr.employee_id = emp.employee_id
INNER JOIN dbo.LEAVE_TYPE lt ON lr.leave_type_id = lt.leave_type_id
LEFT JOIN dbo.EMPLOYEE appr ON lr.approved_by = appr.employee_id
WHERE lr.status = 'REJECTED';
GO

-- Query 5: Employee Leave History (Example: Employee ID = 3, John Doe)
SELECT 
    lr.leave_request_id,
    lt.leave_type_name,
    lr.start_date,
    lr.end_date,
    lr.number_of_days,
    lr.status,
    lr.reason,
    lr.applied_date,
    lr.manager_comment
FROM dbo.LEAVE_REQUEST lr
INNER JOIN dbo.LEAVE_TYPE lt ON lr.leave_type_id = lt.leave_type_id
WHERE lr.employee_id = 3
ORDER BY lr.applied_date DESC;
GO

-- Query 6: Leave Balance per Employee for Year 2026
SELECT 
    emp.employee_id,
    emp.first_name + ' ' + emp.last_name AS employee_name,
    emp.department,
    lt.leave_type_name,
    lb.year,
    lb.allocated_days,
    lb.used_days,
    lb.remaining_days
FROM dbo.LEAVE_BALANCE lb
INNER JOIN dbo.EMPLOYEE emp ON lb.employee_id = emp.employee_id
INNER JOIN dbo.LEAVE_TYPE lt ON lb.leave_type_id = lt.leave_type_id
WHERE lb.year = 2026
ORDER BY emp.employee_id, lt.leave_type_name;
GO

-- Query 7: Departmental Leave Summary Report
SELECT 
    emp.department,
    lt.leave_type_name,
    COUNT(lr.leave_request_id) AS total_applications,
    SUM(CASE WHEN lr.status = 'APPROVED' THEN lr.number_of_days ELSE 0 END) AS total_approved_days,
    SUM(CASE WHEN lr.status = 'PENDING' THEN 1 ELSE 0 END) AS total_pending_count,
    SUM(CASE WHEN lr.status = 'REJECTED' THEN 1 ELSE 0 END) AS total_rejected_count
FROM dbo.EMPLOYEE emp
CROSS JOIN dbo.LEAVE_TYPE lt
LEFT JOIN dbo.LEAVE_REQUEST lr 
    ON emp.employee_id = lr.employee_id 
    AND lt.leave_type_id = lr.leave_type_id
GROUP BY emp.department, lt.leave_type_name
ORDER BY emp.department, lt.leave_type_name;
GO

-- ============================================================================
-- 6. ACTION DML QUERIES
-- ============================================================================

-- Action 1: APPROVE a Leave Request
UPDATE dbo.LEAVE_REQUEST
SET status = 'APPROVED',
    approved_by = 1,
    approved_date = SYSUTCDATETIME(),
    manager_comment = 'Approved by HR.',
    updated_at = SYSUTCDATETIME()
WHERE leave_request_id = 1 AND status = 'PENDING';

UPDATE lb
SET lb.used_days = lb.used_days + lr.number_of_days,
    lb.remaining_days = lb.remaining_days - lr.number_of_days
FROM dbo.LEAVE_BALANCE lb
INNER JOIN dbo.LEAVE_REQUEST lr 
    ON lb.employee_id = lr.employee_id 
    AND lb.leave_type_id = lr.leave_type_id
WHERE lr.leave_request_id = 1 
  AND lb.year = YEAR(lr.start_date)
  AND lr.status = 'APPROVED';

INSERT INTO dbo.LEAVE_APPROVAL (leave_request_id, approver_id, action, comment, decision_date)
VALUES (1, 1, 'APPROVED', 'Approved by HR.', SYSUTCDATETIME());
GO

-- Action 2: REJECT a Leave Request
UPDATE dbo.LEAVE_REQUEST
SET status = 'REJECTED',
    approved_by = 1,
    approved_date = SYSUTCDATETIME(),
    manager_comment = 'Project deadlines in November. Request rejected.',
    updated_at = SYSUTCDATETIME()
WHERE leave_request_id = 4 AND status = 'PENDING';

INSERT INTO dbo.LEAVE_APPROVAL (leave_request_id, approver_id, action, comment, decision_date)
VALUES (4, 1, 'REJECTED', 'Project deadlines in November. Request rejected.', SYSUTCDATETIME());
GO
