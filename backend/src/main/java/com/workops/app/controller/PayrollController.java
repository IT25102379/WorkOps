package com.workops.app.controller;

import com.workops.app.dto.*;
import com.workops.app.service.PayrollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
@Tag(name = "Payroll Management", description = "Endpoints for Salary Records, Overtime Calculations, Payroll Runs, and Event Management")
public class PayrollController {

    private final PayrollService payrollService;

    @GetMapping("/records")
    @Operation(summary = "Retrieve salary records with optional filters (month, year, department, search)")
    public ResponseEntity<ApiResponse<List<PayrollDTO>>> getPayrollRecords(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String search
    ) {
        List<PayrollDTO> list = payrollService.getPayrollRecords(month, year, departmentId, search);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/overtime-summary")
    @Operation(summary = "Calculate overtime payout summaries from approved employee overtime requests")
    public ResponseEntity<ApiResponse<List<PayrollOvertimeSummaryDTO>>> getOvertimeSummary(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year
    ) {
        List<PayrollOvertimeSummaryDTO> list = payrollService.calculateOvertimeSummary(month, year);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PostMapping("/generate")
    @Operation(summary = "Execute and persist monthly payroll run into the database")
    public ResponseEntity<ApiResponse<List<PayrollDTO>>> generatePayroll(
            @Valid @RequestBody PayrollRunRequestDTO runRequest,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : "Payroll Officer";

        List<PayrollDTO> generated = payrollService.generateMonthlyPayroll(runRequest, username);
        return ResponseEntity.ok(ApiResponse.ok("Monthly payroll processed and recorded in database successfully", generated));
    }

    @GetMapping("/payslip/{id}")
    @Operation(summary = "Retrieve single employee payslip by payroll record ID")
    public ResponseEntity<ApiResponse<PayrollDTO>> getPayslip(@PathVariable Long id) {
        PayrollDTO payslip = payrollService.getPayslip(id);
        return ResponseEntity.ok(ApiResponse.ok(payslip));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Update payroll payment status (e.g. mark as PAID or PROCESSED)")
    public ResponseEntity<ApiResponse<PayrollDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : "Payroll Officer";

        PayrollDTO updated = payrollService.updatePaymentStatus(id, status, username);
        return ResponseEntity.ok(ApiResponse.ok("Payroll status updated to " + updated.getPaymentStatus(), updated));
    }

    @PutMapping("/{id}/adjust")
    @Operation(summary = "Adjust allowances, overtime, and salary components for an employee payroll record")
    public ResponseEntity<ApiResponse<PayrollDTO>> adjustPayroll(
            @PathVariable Long id,
            @Valid @RequestBody PayrollAdjustmentDTO adjustmentDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : "Payroll Officer";

        PayrollDTO updated = payrollService.adjustPayroll(id, adjustmentDTO, username);
        return ResponseEntity.ok(ApiResponse.ok("Payroll allowances and overtime updated successfully", updated));
    }

    @GetMapping("/history")
    @Operation(summary = "Retrieve historical salary and payroll run summaries")
    public ResponseEntity<ApiResponse<List<PayrollDTO>>> getPayrollHistory() {
        List<PayrollDTO> history = payrollService.getPayrollHistory();
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/events")
    @Operation(summary = "Retrieve all scheduled company payroll and statutory events")
    public ResponseEntity<ApiResponse<List<PayrollEventDTO>>> getEvents() {
        List<PayrollEventDTO> events = payrollService.getPayrollEvents();
        return ResponseEntity.ok(ApiResponse.ok(events));
    }

    @PostMapping("/events")
    @Operation(summary = "Create a new payroll event / milestone reminder")
    public ResponseEntity<ApiResponse<PayrollEventDTO>> createEvent(
            @Valid @RequestBody PayrollEventDTO eventDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : "Payroll Officer";

        PayrollEventDTO created = payrollService.createPayrollEvent(eventDTO, username);
        return ResponseEntity.ok(ApiResponse.ok("Payroll event scheduled successfully", created));
    }

    @DeleteMapping("/events/{id}")
    @Operation(summary = "Delete a scheduled payroll event")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : "Payroll Officer";

        payrollService.deletePayrollEvent(id, username);
        return ResponseEntity.ok(ApiResponse.ok("Event deleted successfully", null));
    }
}
