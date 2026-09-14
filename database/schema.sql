-- =====================================================================
-- WorkOps - Enterprise Staff Management System Database Schema
-- Database Engine: Microsoft SQL Server (MS SQL 2017+) / Azure SQL
-- =====================================================================

-- Create Database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'workops_db')
BEGIN
    CREATE DATABASE workops_db;
END
GO

USE workops_db;
GO

-- ---------------------------------------------------------------------
-- 1. Table: roles
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.roles', 'U') IS NOT NULL DROP TABLE dbo.roles;
GO

CREATE TABLE dbo.roles (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(50) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- ---------------------------------------------------------------------
-- 2. Table: users
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

CREATE TABLE dbo.users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL UNIQUE,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    last_login_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES dbo.roles (id)
);
GO

CREATE INDEX idx_users_username ON dbo.users (username);
CREATE INDEX idx_users_email ON dbo.users (email);
CREATE INDEX idx_users_role_id ON dbo.users (role_id);
GO

-- ---------------------------------------------------------------------
-- 3. Table: departments
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.departments', 'U') IS NOT NULL DROP TABLE dbo.departments;
GO

CREATE TABLE dbo.departments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    dept_code NVARCHAR(20) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    office_latitude DECIMAL(10, 8) NOT NULL DEFAULT 6.92707900,
    office_longitude DECIMAL(11, 8) NOT NULL DEFAULT 79.86124400,
    geofence_radius_meters INT NOT NULL DEFAULT 350,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX idx_departments_dept_code ON dbo.departments (dept_code);
GO

-- ---------------------------------------------------------------------
-- 4. Table: employees
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.employees', 'U') IS NOT NULL DROP TABLE dbo.employees;
GO

CREATE TABLE dbo.employees (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    department_id BIGINT NOT NULL,
    employee_code NVARCHAR(30) NOT NULL UNIQUE,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    phone NVARCHAR(30) NULL,
    designation NVARCHAR(100) NOT NULL,
    shift_start_time TIME(0) NOT NULL DEFAULT '08:30:00',
    shift_end_time TIME(0) NOT NULL DEFAULT '17:30:00',
    grace_period_minutes INT NOT NULL DEFAULT 15,
    emergency_contact_name NVARCHAR(100) NULL,
    emergency_contact_phone NVARCHAR(30) NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'ON_PROBATION', 'TERMINATED')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES dbo.departments (id)
);
GO

CREATE INDEX idx_employees_emp_code ON dbo.employees (employee_code);
CREATE INDEX idx_employees_user_id ON dbo.employees (user_id);
CREATE INDEX idx_employees_dept_id ON dbo.employees (department_id);
CREATE INDEX idx_employees_status ON dbo.employees (status);
GO

-- ---------------------------------------------------------------------
-- 5. Table: attendance (Core Focus Module)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.attendance', 'U') IS NOT NULL DROP TABLE dbo.attendance;
GO

CREATE TABLE dbo.attendance (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    clock_in_time DATETIME2 NULL,
    clock_out_time DATETIME2 NULL,
    clock_in_latitude DECIMAL(10, 8) NULL,
    clock_in_longitude DECIMAL(11, 8) NULL,
    clock_out_latitude DECIMAL(10, 8) NULL,
    clock_out_longitude DECIMAL(11, 8) NULL,
    clock_in_ip NVARCHAR(64) NULL,
    clock_out_ip NVARCHAR(64) NULL,
    clock_in_user_agent NVARCHAR(255) NULL,
    clock_out_user_agent NVARCHAR(255) NULL,
    work_duration_minutes INT NOT NULL DEFAULT 0,
    late_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    early_departure_minutes INT NOT NULL DEFAULT 0,
    status NVARCHAR(30) NOT NULL DEFAULT 'PRESENT'
        CHECK (status IN ('PRESENT', 'LATE_ARRIVAL', 'HALF_DAY', 'EARLY_DEPARTURE', 'OVERTIME', 'ON_LEAVE', 'ABSENT')),
    is_geofence_verified BIT NOT NULL DEFAULT 0,
    remarks NVARCHAR(500) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees (id) ON DELETE CASCADE,
    CONSTRAINT uk_emp_attendance_date UNIQUE (employee_id, attendance_date)
);
GO

CREATE INDEX idx_attendance_emp_id ON dbo.attendance (employee_id);
CREATE INDEX idx_attendance_date ON dbo.attendance (attendance_date);
CREATE INDEX idx_attendance_status ON dbo.attendance (status);
CREATE INDEX idx_attendance_clock_in ON dbo.attendance (clock_in_time);
GO

-- ---------------------------------------------------------------------
-- 6. Table: attendance_requests (Correction Workflow)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.attendance_requests', 'U') IS NOT NULL DROP TABLE dbo.attendance_requests;
GO

CREATE TABLE dbo.attendance_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    attendance_id BIGINT NULL,
    employee_id BIGINT NOT NULL,
    request_type NVARCHAR(30) NOT NULL
        CHECK (request_type IN ('MISSED_CLOCK_IN', 'MISSED_CLOCK_OUT', 'TIME_CORRECTION', 'STATUS_CHANGE')),
    requested_date DATE NOT NULL,
    requested_clock_in DATETIME2 NULL,
    requested_clock_out DATETIME2 NULL,
    reason NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by BIGINT NULL,
    review_comment NVARCHAR(MAX) NULL,
    reviewed_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_att_req_attendance FOREIGN KEY (attendance_id) REFERENCES dbo.attendance (id) ON DELETE SET NULL,
    CONSTRAINT fk_att_req_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_req_reviewer FOREIGN KEY (reviewed_by) REFERENCES dbo.users (id) ON DELETE SET NULL
);
GO

CREATE INDEX idx_att_req_emp_id ON dbo.attendance_requests (employee_id);
CREATE INDEX idx_att_req_status ON dbo.attendance_requests (status);
CREATE INDEX idx_att_req_date ON dbo.attendance_requests (requested_date);
GO

-- ---------------------------------------------------------------------
-- 7. Table: leave_requests
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.leave_requests', 'U') IS NOT NULL DROP TABLE dbo.leave_requests;
GO

CREATE TABLE dbo.leave_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    leave_type NVARCHAR(30) NOT NULL
        CHECK (leave_type IN ('ANNUAL', 'CASUAL', 'MEDICAL', 'UNPAID')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4, 1) NOT NULL,
    reason NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by) REFERENCES dbo.users (id) ON DELETE SET NULL
);
GO

-- ---------------------------------------------------------------------
-- 8. Table: payroll
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.payroll', 'U') IS NOT NULL DROP TABLE dbo.payroll;
GO

CREATE TABLE dbo.payroll (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    payroll_month INT NOT NULL,
    payroll_year INT NOT NULL,
    basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    overtime_pay DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    allowances DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    deductions DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_status NVARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (payment_status IN ('DRAFT', 'PROCESSED', 'PAID')),
    payment_date DATE NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_payroll_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees (id) ON DELETE CASCADE,
    CONSTRAINT uk_payroll_emp_month_year UNIQUE (employee_id, payroll_month, payroll_year)
);
GO

-- ---------------------------------------------------------------------
-- 9. Table: performance_reviews
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.performance_reviews', 'U') IS NOT NULL DROP TABLE dbo.performance_reviews;
GO

CREATE TABLE dbo.performance_reviews (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    review_period NVARCHAR(50) NOT NULL,
    rating DECIMAL(3, 2) NOT NULL,
    goals_achieved NVARCHAR(MAX) NULL,
    feedback NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_perf_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_reviewer FOREIGN KEY (reviewer_id) REFERENCES dbo.users (id) ON DELETE NO ACTION
);
GO

-- =====================================================================
-- INITIAL SEED DATA (Microsoft SQL Server Format)
-- =====================================================================

-- 1. Roles
SET IDENTITY_INSERT dbo.roles ON;
INSERT INTO dbo.roles (id, name, description) VALUES
(1, 'ROLE_ADMIN', 'Full system access and configurations'),
(2, 'ROLE_HR', 'Human resources and staff attendance/leave manager'),
(3, 'ROLE_MANAGER', 'Team supervisor for attendance and performance approvals'),
(4, 'ROLE_STAFF', 'Standard regular employee'),
(5, 'ROLE_PAYROLL', 'Payroll officer and financial analyst');
SET IDENTITY_INSERT dbo.roles OFF;
GO

-- 2. Departments
SET IDENTITY_INSERT dbo.departments ON;
INSERT INTO dbo.departments (id, dept_code, name, description, office_latitude, office_longitude, geofence_radius_meters) VALUES
(1, 'ENG', 'Engineering & Technology', 'Software development, DevOps, and QA teams', 6.92707900, 79.86124400, 350),
(2, 'HR', 'Human Resources', 'Talent acquisition, relations, and welfare', 6.92707900, 79.86124400, 350),
(3, 'FIN', 'Finance & Accounting', 'Payroll, accounting, and financial planning', 6.92707900, 79.86124400, 350),
(4, 'MKT', 'Marketing & Sales', 'Brand growth, digital campaigns, and sales operations', 6.92707900, 79.86124400, 350);
SET IDENTITY_INSERT dbo.departments OFF;
GO

-- 3. Users (Passwords hashed with BCrypt for 'Password@123')
SET IDENTITY_INSERT dbo.users ON;
INSERT INTO dbo.users (id, username, email, password_hash, role_id, is_active) VALUES
(1, 'admin', 'admin@workops.io', '$2a$10$fjnma/2IFUusPAWzB7vImu5U9rXURNu1/6vm8lCjk7aSR8mqIPeii', 1, 1),
(2, 'sarah.hr', 'sarah.connor@workops.io', '$2a$10$fjnma/2IFUusPAWzB7vImu5U9rXURNu1/6vm8lCjk7aSR8mqIPeii', 2, 1),
(3, 'alex.manager', 'alex.cross@workops.io', '$2a$10$fjnma/2IFUusPAWzB7vImu5U9rXURNu1/6vm8lCjk7aSR8mqIPeii', 3, 1),
(4, 'john.doe', 'john.doe@workops.io', '$2a$10$fjnma/2IFUusPAWzB7vImu5U9rXURNu1/6vm8lCjk7aSR8mqIPeii', 4, 1),
(5, 'emma.watson', 'emma.watson@workops.io', '$2a$10$fjnma/2IFUusPAWzB7vImu5U9rXURNu1/6vm8lCjk7aSR8mqIPeii', 4, 1),
(6, 'david.fin', 'david.fin@workops.io', '$2a$10$fjnma/2IFUusPAWzB7vImu5U9rXURNu1/6vm8lCjk7aSR8mqIPeii', 5, 1);
SET IDENTITY_INSERT dbo.users OFF;
GO

-- 4. Employees
SET IDENTITY_INSERT dbo.employees ON;
INSERT INTO dbo.employees (id, user_id, department_id, employee_code, first_name, last_name, email, phone, designation, shift_start_time, shift_end_time, grace_period_minutes, emergency_contact_name, emergency_contact_phone, status) VALUES
(1, 1, 1, 'EMP-001', 'System', 'Administrator', 'admin@workops.io', '+1-555-0100', 'Chief Technology Officer', '08:30:00', '17:30:00', 15, 'Tech Support', '+1-555-0101', 'ACTIVE'),
(2, 2, 2, 'EMP-002', 'Sarah', 'Connor', 'sarah.connor@workops.io', '+1-555-0102', 'Head of Human Resources', '08:30:00', '17:30:00', 15, 'John Connor', '+1-555-0103', 'ACTIVE'),
(3, 3, 1, 'EMP-003', 'Alex', 'Cross', 'alex.cross@workops.io', '+1-555-0104', 'Engineering Manager', '08:30:00', '17:30:00', 15, 'Maria Cross', '+1-555-0105', 'ACTIVE'),
(4, 4, 1, 'EMP-004', 'John', 'Doe', 'john.doe@workops.io', '+1-555-0106', 'Senior Full Stack Engineer', '08:30:00', '17:30:00', 15, 'Jane Doe', '+1-555-0107', 'ACTIVE'),
(5, 5, 4, 'EMP-005', 'Emma', 'Watson', 'emma.watson@workops.io', '+1-555-0108', 'Growth Marketing Specialist', '09:00:00', '18:00:00', 15, 'Chris Watson', '+1-555-0109', 'ACTIVE'),
(6, 6, 3, 'EMP-006', 'David', 'Beck', 'david.fin@workops.io', '+1-555-0110', 'Payroll Controller', '08:30:00', '17:30:00', 15, 'Victoria Beck', '+1-555-0111', 'ACTIVE');
SET IDENTITY_INSERT dbo.employees OFF;
GO

-- 5. Attendance Records
SET IDENTITY_INSERT dbo.attendance ON;
INSERT INTO dbo.attendance (id, employee_id, attendance_date, clock_in_time, clock_out_time, clock_in_latitude, clock_in_longitude, clock_out_latitude, clock_out_longitude, clock_in_ip, clock_out_ip, clock_in_user_agent, clock_out_user_agent, work_duration_minutes, late_minutes, overtime_minutes, early_departure_minutes, status, is_geofence_verified, remarks) VALUES
(1, 4, CAST(GETDATE() AS DATE), DATEADD(minute, 24, DATEADD(hour, 8, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), NULL, 6.927100, 79.861200, NULL, NULL, '192.168.1.45', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NULL, 0, 0, 0, 0, 'PRESENT', 1, 'On-time clock-in via Web Portal'),
(2, 5, CAST(GETDATE() AS DATE), DATEADD(minute, 22, DATEADD(hour, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), NULL, 6.927050, 79.861250, NULL, NULL, '192.168.1.72', NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NULL, 0, 22, 0, 0, 'LATE_ARRIVAL', 1, 'Traffic delay reported'),
(3, 3, CAST(GETDATE() AS DATE), DATEADD(minute, 15, DATEADD(hour, 8, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), NULL, 6.927080, 79.861240, NULL, NULL, '192.168.1.12', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NULL, 0, 0, 0, 0, 'PRESENT', 1, 'Regular shift start'),
(4, 2, CAST(GETDATE() AS DATE), DATEADD(minute, 28, DATEADD(hour, 8, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), NULL, 6.927070, 79.861230, NULL, NULL, '192.168.1.20', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NULL, 0, 0, 0, 0, 'PRESENT', 1, 'HR shift active'),
(5, 4, DATEADD(day, -1, CAST(GETDATE() AS DATE)), DATEADD(minute, 25, DATEADD(hour, 8, CAST(DATEADD(day, -1, CAST(GETDATE() AS DATE)) AS DATETIME2))), DATEADD(minute, 45, DATEADD(hour, 18, CAST(DATEADD(day, -1, CAST(GETDATE() AS DATE)) AS DATETIME2))), 6.927100, 79.861200, 6.927100, 79.861200, '192.168.1.45', '192.168.1.45', 'Mozilla/5.0', 'Mozilla/5.0', 620, 0, 75, 0, 'OVERTIME', 1, 'Critical release deployment sprint');
SET IDENTITY_INSERT dbo.attendance OFF;
GO

-- 6. Attendance Correction Request
SET IDENTITY_INSERT dbo.attendance_requests ON;
INSERT INTO dbo.attendance_requests (id, attendance_id, employee_id, request_type, requested_date, requested_clock_in, requested_clock_out, reason, status, reviewed_by, review_comment, reviewed_at) VALUES
(1, 2, 5, 'TIME_CORRECTION', CAST(GETDATE() AS DATE), DATEADD(minute, 35, DATEADD(hour, 8, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), NULL, 'Security badge scanner at gate 2 was malfunctioning. Arrived at 08:35 AM.', 'PENDING', NULL, NULL, NULL);
SET IDENTITY_INSERT dbo.attendance_requests OFF;
GO

-- 7. Public Contact Messages
IF OBJECT_ID('dbo.contact_messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.contact_messages (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(150) NOT NULL,
        email NVARCHAR(150) NOT NULL,
        subject NVARCHAR(100) NULL,
        message NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'NEW'
            CONSTRAINT chk_contact_messages_status CHECK (status IN ('NEW', 'READ', 'RESOLVED')),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX idx_contact_messages_status ON dbo.contact_messages (status);
    CREATE INDEX idx_contact_messages_created_at ON dbo.contact_messages (created_at);
END;
GO
