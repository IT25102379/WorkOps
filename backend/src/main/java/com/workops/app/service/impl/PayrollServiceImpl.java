package com.workops.app.service.impl;

import com.workops.app.dto.*;
import com.workops.app.entity.*;
import com.workops.app.exception.ResourceNotFoundException;
import com.workops.app.repository.*;
import com.workops.app.service.PayrollService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollServiceImpl implements PayrollService {

    private final PayrollRepository payrollRepository;
    private final PayrollEventRepository payrollEventRepository;
    private final EmployeeRepository employeeRepository;
    private final OvertimeRequestRepository overtimeRequestRepository;
    private final GeneratedReportRepository generatedReportRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PayrollDTO> getPayrollRecords(Integer month, Integer year, Long departmentId, String search) {
        if (month == null) month = LocalDate.now().getMonthValue();
        if (year == null) year = LocalDate.now().getYear();

        List<Payroll> records = payrollRepository.filterPayroll(month, year, departmentId, search);

        // If no records exist yet for this month, generate preview from active employees
        if (records.isEmpty()) {
            return generatePreviewRecords(month, year, departmentId);
        }

        return records.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayrollOvertimeSummaryDTO> calculateOvertimeSummary(Integer month, Integer year) {
        if (month == null) month = LocalDate.now().getMonthValue();
        if (year == null) year = LocalDate.now().getYear();

        List<Employee> employees = employeeRepository.findAll();
        List<OvertimeRequest> allOt = overtimeRequestRepository.findAll();

        final int targetMonth = month;
        final int targetYear = year;

        List<PayrollOvertimeSummaryDTO> summaries = new ArrayList<>();

        for (Employee emp : employees) {
            BigDecimal baseSalary = getBaseSalaryForEmployee(emp);
            BigDecimal hourlyRate = baseSalary.divide(BigDecimal.valueOf(200), 2, RoundingMode.HALF_UP);

            List<OvertimeRequest> empOt = allOt.stream()
                    .filter(ot -> ot.getEmployee() != null && ot.getEmployee().getId().equals(emp.getId()))
                    .filter(ot -> ot.getOtDate() != null && ot.getOtDate().getMonthValue() == targetMonth && ot.getOtDate().getYear() == targetYear)
                    .filter(ot -> "APPROVED".equalsIgnoreCase(ot.getStatus()))
                    .collect(Collectors.toList());

            BigDecimal totalHours = BigDecimal.ZERO;
            BigDecimal totalPayout = BigDecimal.ZERO;

            for (OvertimeRequest ot : empOt) {
                BigDecimal hours = ot.getOtHours() != null ? ot.getOtHours() : BigDecimal.ZERO;
                BigDecimal mult = ot.getMultiplierRate() != null ? ot.getMultiplierRate() : new BigDecimal("1.50");
                totalHours = totalHours.add(hours);

                BigDecimal itemPayout = hours.multiply(hourlyRate).multiply(mult);
                totalPayout = totalPayout.add(itemPayout);
            }

            summaries.add(PayrollOvertimeSummaryDTO.builder()
                    .employeeId(emp.getId())
                    .employeeCode(emp.getEmployeeCode())
                    .employeeName(emp.getFullName())
                    .departmentName(emp.getDepartment() != null ? emp.getDepartment().getName() : "General")
                    .basicSalary(baseSalary)
                    .approvedOtHours(totalHours.setScale(1, RoundingMode.HALF_UP))
                    .hourlyOtRate(hourlyRate)
                    .totalOtPayout(totalPayout.setScale(2, RoundingMode.HALF_UP))
                    .totalApprovedRecords(empOt.size())
                    .build());
        }

        return summaries;
    }

    @Override
    @Transactional
    public List<PayrollDTO> generateMonthlyPayroll(PayrollRunRequestDTO runRequest, String username) {
        int month = (runRequest.getPayrollMonth() != null) ? runRequest.getPayrollMonth() : LocalDate.now().getMonthValue();
        int year = (runRequest.getPayrollYear() != null) ? runRequest.getPayrollYear() : LocalDate.now().getYear();

        log.info("Executing monthly payroll generation: month={}, year={}, by={}", month, year, username);

        List<Employee> targetEmployees = (runRequest.getDepartmentId() != null)
                ? employeeRepository.findByDepartmentId(runRequest.getDepartmentId())
                : employeeRepository.findAll();

        List<PayrollOvertimeSummaryDTO> otSummaries = calculateOvertimeSummary(month, year);
        Map<Long, BigDecimal> otMap = otSummaries.stream()
                .collect(Collectors.toMap(PayrollOvertimeSummaryDTO::getEmployeeId, PayrollOvertimeSummaryDTO::getTotalOtPayout));

        List<Payroll> savedPayrolls = new ArrayList<>();

        for (Employee emp : targetEmployees) {
            BigDecimal basic = getBaseSalaryForEmployee(emp);
            BigDecimal otPay = (runRequest.getIncludeOvertime() != null && !runRequest.getIncludeOvertime())
                    ? BigDecimal.ZERO
                    : otMap.getOrDefault(emp.getId(), BigDecimal.ZERO);

            BigDecimal allowances = basic.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP);
            if (runRequest.getBonusAmount() != null) {
                allowances = allowances.add(runRequest.getBonusAmount());
            }

            // Standard statutory deductions: EPF 8% + APIT
            BigDecimal epf = basic.multiply(new BigDecimal("0.08")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal tax = (basic.compareTo(new BigDecimal("100000")) > 0)
                    ? basic.subtract(new BigDecimal("100000")).multiply(new BigDecimal("0.06")).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal deductions = epf.add(tax);

            BigDecimal net = basic.add(otPay).add(allowances).subtract(deductions);

            Payroll payroll = payrollRepository.findByEmployeeIdAndPayrollMonthAndPayrollYear(emp.getId(), month, year)
                    .orElse(Payroll.builder()
                            .employee(emp)
                            .payrollMonth(month)
                            .payrollYear(year)
                            .build());

            payroll.setBasicSalary(basic);
            payroll.setOvertimePay(otPay);
            payroll.setAllowances(allowances);
            payroll.setDeductions(deductions);
            payroll.setTax(tax);
            payroll.setNetSalary(net);
            payroll.setPaymentStatus("PROCESSED");
            payroll.setPaymentDate(LocalDate.now());

            savedPayrolls.add(payrollRepository.save(payroll));
        }

        // Audit Report Log
        try {
            GeneratedReport report = GeneratedReport.builder()
                    .reportTitle("Monthly Payroll Run — " + month + "/" + year)
                    .reportType("PAYROLL")
                    .module("PAYROLL")
                    .fileName("payroll_run_" + year + "_" + month + ".pdf")
                    .recordCount(savedPayrolls.size())
                    .filterCriteria("Month: " + month + ", Year: " + year)
                    .generatedBy(username != null ? username : "Payroll Officer")
                    .status("COMPLETED")
                    .build();
            generatedReportRepository.save(report);
        } catch (Exception e) {
            log.warn("Could not log payroll run report audit: {}", e.getMessage());
        }

        return savedPayrolls.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PayrollDTO getPayslip(Long id) {
        Payroll p = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll record not found with ID: " + id));
        return mapToDTO(p);
    }

    @Override
    @Transactional
    public PayrollDTO updatePaymentStatus(Long id, String status, String username) {
        Payroll p = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll record not found with ID: " + id));

        p.setPaymentStatus((status != null) ? status.toUpperCase() : "PAID");
        if ("PAID".equalsIgnoreCase(status)) {
            p.setPaymentDate(LocalDate.now());
        }
        Payroll saved = payrollRepository.save(p);
        log.info("Payroll record #{} status updated to {} by {}", id, saved.getPaymentStatus(), username);
        return mapToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayrollDTO> getPayrollHistory() {
        return payrollRepository.findAllByOrderByPayrollYearDescPayrollMonthDesc()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayrollEventDTO> getPayrollEvents() {
        List<PayrollEvent> events = payrollEventRepository.findAllByOrderByEventDateAsc();
        if (events.isEmpty()) {
            return generateDefaultPayrollEvents();
        }
        return events.stream().map(this::mapEventToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PayrollEventDTO createPayrollEvent(PayrollEventDTO eventDTO, String username) {
        PayrollEvent event = PayrollEvent.builder()
                .title(eventDTO.getTitle() != null ? eventDTO.getTitle() : "Payroll Milestone")
                .eventType(eventDTO.getEventType() != null ? eventDTO.getEventType() : "PAYROLL_CUTOFF")
                .eventDate(eventDTO.getEventDate() != null ? eventDTO.getEventDate() : LocalDate.now().plusDays(7))
                .description(eventDTO.getDescription())
                .priority(eventDTO.getPriority() != null ? eventDTO.getPriority().toUpperCase() : "MEDIUM")
                .createdBy(username != null ? username : "Payroll Officer")
                .build();

        PayrollEvent saved = payrollEventRepository.save(event);
        return mapEventToDTO(saved);
    }

    @Override
    @Transactional
    public void deletePayrollEvent(Long id, String username) {
        PayrollEvent event = payrollEventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + id));
        payrollEventRepository.delete(event);
        log.info("Payroll event #{} deleted by {}", id, username);
    }

    @Override
    @Transactional
    public PayrollDTO adjustPayroll(Long id, PayrollAdjustmentDTO adjustmentDTO, String username) {
        log.info("Adjusting payroll record / preview #{} by {}", id, username);

        Optional<Payroll> existingOpt = payrollRepository.findById(id);
        Payroll payroll;

        if (existingOpt.isPresent()) {
            payroll = existingOpt.get();
        } else {
            // Check if ID refers to an employee ID (preview item)
            Employee emp = employeeRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Payroll or Employee record not found with ID: " + id));

            int month = (adjustmentDTO.getPayrollMonth() != null) ? adjustmentDTO.getPayrollMonth() : LocalDate.now().getMonthValue();
            int year = (adjustmentDTO.getPayrollYear() != null) ? adjustmentDTO.getPayrollYear() : LocalDate.now().getYear();

            payroll = payrollRepository.findByEmployeeIdAndPayrollMonthAndPayrollYear(emp.getId(), month, year)
                    .orElse(Payroll.builder()
                            .employee(emp)
                            .payrollMonth(month)
                            .payrollYear(year)
                            .build());
        }

        BigDecimal basic = (adjustmentDTO.getBasicSalary() != null && adjustmentDTO.getBasicSalary().compareTo(BigDecimal.ZERO) > 0)
                ? adjustmentDTO.getBasicSalary()
                : (payroll.getBasicSalary() != null && payroll.getBasicSalary().compareTo(BigDecimal.ZERO) > 0 ? payroll.getBasicSalary() : new BigDecimal("50000.00"));

        BigDecimal allowances = (adjustmentDTO.getAllowances() != null) ? adjustmentDTO.getAllowances() : BigDecimal.ZERO;
        BigDecimal overtimePay = (adjustmentDTO.getOvertimePay() != null) ? adjustmentDTO.getOvertimePay() : BigDecimal.ZERO;

        BigDecimal deductions;
        if (adjustmentDTO.getDeductions() != null) {
            deductions = adjustmentDTO.getDeductions();
        } else {
            BigDecimal epf = basic.multiply(new BigDecimal("0.08")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal tax = (basic.compareTo(new BigDecimal("100000")) > 0)
                    ? basic.subtract(new BigDecimal("100000")).multiply(new BigDecimal("0.06")).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            deductions = epf.add(tax);
        }

        BigDecimal net = basic.add(allowances).add(overtimePay).subtract(deductions);

        payroll.setBasicSalary(basic);
        payroll.setAllowances(allowances);
        payroll.setOvertimePay(overtimePay);
        payroll.setDeductions(deductions);
        payroll.setNetSalary(net);
        if (payroll.getPaymentStatus() == null) {
            payroll.setPaymentStatus("PROCESSED");
        }

        Payroll saved = payrollRepository.save(payroll);
        log.info("Payroll adjustments saved for employee #{} - Net: {}", (saved.getEmployee() != null ? saved.getEmployee().getId() : null), net);
        return mapToDTO(saved);
    }

    private BigDecimal getBaseSalaryForEmployee(Employee emp) {
        // Standard company baseline basic salary of LKR 50,000.00 for all workforce employees
        return new BigDecimal("50000.00");
    }

    private List<PayrollDTO> generatePreviewRecords(int month, int year, Long deptId) {
        List<Employee> employees = (deptId != null)
                ? employeeRepository.findByDepartmentId(deptId)
                : employeeRepository.findAll();

        List<PayrollOvertimeSummaryDTO> otSummaries = calculateOvertimeSummary(month, year);
        Map<Long, BigDecimal> otMap = otSummaries.stream()
                .collect(Collectors.toMap(PayrollOvertimeSummaryDTO::getEmployeeId, PayrollOvertimeSummaryDTO::getTotalOtPayout));

        return employees.stream().map(emp -> {
            BigDecimal basic = getBaseSalaryForEmployee(emp);
            BigDecimal ot = otMap.getOrDefault(emp.getId(), BigDecimal.ZERO);
            BigDecimal allowances = basic.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal epf = basic.multiply(new BigDecimal("0.08")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal tax = (basic.compareTo(new BigDecimal("100000")) > 0)
                    ? basic.subtract(new BigDecimal("100000")).multiply(new BigDecimal("0.06")).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal deductions = epf.add(tax);
            BigDecimal net = basic.add(ot).add(allowances).subtract(deductions);

            return PayrollDTO.builder()
                    .id(emp.getId())
                    .employeeId(emp.getId())
                    .employeeCode(emp.getEmployeeCode())
                    .employeeName(emp.getFullName())
                    .departmentName(emp.getDepartment() != null ? emp.getDepartment().getName() : "General")
                    .designation(emp.getDesignation())
                    .email(emp.getEmail())
                    .payrollMonth(month)
                    .payrollYear(year)
                    .basicSalary(basic)
                    .overtimePay(ot)
                    .allowances(allowances)
                    .deductions(deductions)
                    .tax(tax)
                    .netSalary(net)
                    .paymentStatus("DRAFT")
                    .paymentDate(LocalDate.now())
                    .createdAt(LocalDateTime.now())
                    .build();
        }).collect(Collectors.toList());
    }

    private List<PayrollEventDTO> generateDefaultPayrollEvents() {
        return List.of(
                PayrollEventDTO.builder().id(1L).title("Monthly Attendance & OT Freeze").eventType("PAYROLL_CUTOFF").eventDate(LocalDate.now().withDayOfMonth(20)).description("All employee overtime claims and attendance corrections must be approved").priority("HIGH").createdBy("Payroll Officer").build(),
                PayrollEventDTO.builder().id(2L).title("Executive Salary Disbursement Payout").eventType("SALARY_PAYOUT").eventDate(LocalDate.now().withDayOfMonth(25)).description("Direct bank transfer salary batch execution for all departments").priority("URGENT").createdBy("Payroll Officer").build(),
                PayrollEventDTO.builder().id(3L).title("EPF & ETF Statutory Tax Remittance").eventType("TAX_FILING").eventDate(LocalDate.now().plusMonths(1).withDayOfMonth(15)).description("Monthly Central Bank statutory EPF Form C and ETF returns submission").priority("HIGH").createdBy("Payroll Officer").build(),
                PayrollEventDTO.builder().id(4L).title("Quarterly Performance Bonus Evaluation").eventType("BONUS_PAY").eventDate(LocalDate.now().plusDays(12)).description("Performance KPI multiplier bonus calculations for Engineering & Sales").priority("MEDIUM").createdBy("Payroll Officer").build()
        );
    }

    private PayrollDTO mapToDTO(Payroll p) {
        return PayrollDTO.builder()
                .id(p.getId())
                .employeeId(p.getEmployee() != null ? p.getEmployee().getId() : null)
                .employeeCode(p.getEmployee() != null ? p.getEmployee().getEmployeeCode() : "EMP-000")
                .employeeName(p.getEmployee() != null ? p.getEmployee().getFullName() : "Unknown")
                .departmentName(p.getEmployee() != null && p.getEmployee().getDepartment() != null ? p.getEmployee().getDepartment().getName() : "General")
                .designation(p.getEmployee() != null ? p.getEmployee().getDesignation() : "")
                .email(p.getEmployee() != null ? p.getEmployee().getEmail() : "")
                .payrollMonth(p.getPayrollMonth())
                .payrollYear(p.getPayrollYear())
                .basicSalary(p.getBasicSalary())
                .overtimePay(p.getOvertimePay())
                .allowances(p.getAllowances())
                .deductions(p.getDeductions())
                .tax(p.getTax())
                .netSalary(p.getNetSalary())
                .paymentStatus(p.getPaymentStatus())
                .paymentDate(p.getPaymentDate())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private PayrollEventDTO mapEventToDTO(PayrollEvent e) {
        return PayrollEventDTO.builder()
                .id(e.getId())
                .title(e.getTitle())
                .eventType(e.getEventType())
                .eventDate(e.getEventDate())
                .description(e.getDescription())
                .priority(e.getPriority())
                .createdBy(e.getCreatedBy())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
