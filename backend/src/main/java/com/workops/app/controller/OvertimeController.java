package com.workops.app.controller;

import com.workops.app.dto.ApiResponse;
import com.workops.app.dto.OvertimeRequestDTO;
import com.workops.app.dto.OvertimeStatusUpdateDTO;
import com.workops.app.service.OvertimeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/overtime")
@RequiredArgsConstructor
@Tag(name = "Overtime Management", description = "Endpoints for Overtime (OT) form creation, approval, and CRUD operations")
public class OvertimeController {

    private final OvertimeService overtimeService;

    @PostMapping
    @Operation(summary = "Create an Overtime (OT) Request or Allocation (HR/Manager or Employee)")
    public ResponseEntity<ApiResponse<OvertimeRequestDTO>> createOvertime(
            @RequestBody OvertimeRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : (requestDTO != null && requestDTO.getCreatedBy() != null ? requestDTO.getCreatedBy() : "HR Manager");

        OvertimeRequestDTO created = overtimeService.createOvertime(requestDTO, username);
        return new ResponseEntity<>(ApiResponse.ok("Overtime request created successfully", created), HttpStatus.CREATED);
    }

    @GetMapping("/employees")
    @Operation(summary = "Retrieve all real employee profiles from the database for form selection")
    public ResponseEntity<ApiResponse<List<com.workops.app.dto.EmployeeSummaryDTO>>> getEmployees() {
        List<com.workops.app.dto.EmployeeSummaryDTO> employees = overtimeService.getActiveEmployees();
        return ResponseEntity.ok(ApiResponse.ok(employees));
    }

    @GetMapping
    @Operation(summary = "Retrieve all Overtime records with optional filters (Date, Status, Search)")
    public ResponseEntity<ApiResponse<List<OvertimeRequestDTO>>> getAllOvertime(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        List<OvertimeRequestDTO> list = overtimeService.getAllOvertime(startDate, endDate, status, search);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/my")
    @Operation(summary = "Retrieve Overtime records for the currently authenticated user / employee profile")
    public ResponseEntity<ApiResponse<List<OvertimeRequestDTO>>> getMyOvertime(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String username
    ) {
        String user = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : (username != null ? username : "john.doe");

        List<OvertimeRequestDTO> list = overtimeService.getMyOvertime(user);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a specific Overtime record by ID")
    public ResponseEntity<ApiResponse<OvertimeRequestDTO>> getOvertimeById(@PathVariable Long id) {
        OvertimeRequestDTO dto = overtimeService.getOvertimeById(id);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an Overtime (OT) record details (HR Manager Edit)")
    public ResponseEntity<ApiResponse<OvertimeRequestDTO>> updateOvertime(
            @PathVariable Long id,
            @RequestBody OvertimeRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : "HR Manager";

        OvertimeRequestDTO updated = overtimeService.updateOvertime(id, requestDTO, username);
        return ResponseEntity.ok(ApiResponse.ok("Overtime record updated successfully", updated));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Approve or Reject an Overtime request")
    public ResponseEntity<ApiResponse<OvertimeRequestDTO>> updateOvertimeStatus(
            @PathVariable Long id,
            @RequestBody OvertimeStatusUpdateDTO statusDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : (statusDTO != null && statusDTO.getApprovedBy() != null ? statusDTO.getApprovedBy() : "HR Manager");

        OvertimeRequestDTO updated = overtimeService.updateOvertimeStatus(id, statusDTO, username);
        return ResponseEntity.ok(ApiResponse.ok("Overtime status updated to " + updated.getStatus(), updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an Overtime record (HR Manager CRUD)")
    public ResponseEntity<ApiResponse<Void>> deleteOvertime(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null && userDetails.getUsername() != null)
                ? userDetails.getUsername()
                : "HR Manager";

        overtimeService.deleteOvertime(id, username);
        return ResponseEntity.ok(ApiResponse.ok("Overtime record deleted successfully", null));
    }
}
