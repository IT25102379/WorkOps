package com.workops.app.controller;

import com.workops.app.dto.*;
import com.workops.app.entity.enums.RequestStatus;
import com.workops.app.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance Management", description = "Endpoints for Clock-In/Out, Live Timers, Geofencing, KPIs & Correction Requests")
@SecurityRequirement(name = "BearerAuth")
@PreAuthorize("hasAuthority('ROLE_HR')")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/clock-in")
    @Operation(summary = "Perform employee clock-in with GPS verification, shift status & IP audit")
    public ResponseEntity<ApiResponse<AttendanceResponseDTO>> clockIn(
            @Valid @RequestBody ClockInRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest servletRequest
    ) {
        String username = (userDetails != null) ? userDetails.getUsername() : "anonymousUser";
        AttendanceResponseDTO response = attendanceService.clockIn(request, username, servletRequest);
        return ResponseEntity.ok(ApiResponse.ok("Clock-in recorded successfully", response));
    }

    @PostMapping("/clock-out")
    @Operation(summary = "Perform employee clock-out, compute work duration, overtime and early departure")
    public ResponseEntity<ApiResponse<AttendanceResponseDTO>> clockOut(
            @Valid @RequestBody ClockOutRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest servletRequest
    ) {
        String username = (userDetails != null) ? userDetails.getUsername() : "anonymousUser";
        AttendanceResponseDTO response = attendanceService.clockOut(request, username, servletRequest);
        return ResponseEntity.ok(ApiResponse.ok("Clock-out recorded successfully", response));
    }

    @GetMapping("/status/today")
    @Operation(summary = "Get current shift status, live elapsed timer, and department geofence coordinates")
    public ResponseEntity<ApiResponse<TodayStatusDTO>> getTodayStatus(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null) ? userDetails.getUsername() : "anonymousUser";
        TodayStatusDTO status = attendanceService.getTodayStatus(username);
        return ResponseEntity.ok(ApiResponse.ok(status));
    }

    @GetMapping("/records")
    @Operation(summary = "Search and filter attendance records by date range, department, status, and name")
    public ResponseEntity<ApiResponse<List<AttendanceResponseDTO>>> getAttendanceRecords(
            @ModelAttribute AttendanceFilterDTO filterDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = userDetails != null ? userDetails.getUsername() : "anonymousUser";
        boolean canViewAll = userDetails != null && userDetails.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")
                        || authority.getAuthority().equals("ROLE_HR")
                        || authority.getAuthority().equals("ROLE_MANAGER"));
        List<AttendanceResponseDTO> records = attendanceService.getFilteredAttendance(filterDTO, username, canViewAll);
        return ResponseEntity.ok(ApiResponse.ok(records));
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER')")
    @Operation(summary = "Retrieve real-time KPI metrics for attendance summary cards")
    public ResponseEntity<ApiResponse<AttendanceKpiDTO>> getAttendanceKpis(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        AttendanceKpiDTO kpis = attendanceService.getAttendanceKpis(date);
        return ResponseEntity.ok(ApiResponse.ok(kpis));
    }

    @PostMapping("/corrections")
    @Operation(summary = "Submit a missed clock-in/out or time correction request")
    public ResponseEntity<ApiResponse<AttendanceCorrectionRequestDTO>> submitCorrection(
            @Valid @RequestBody AttendanceCorrectionRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null) ? userDetails.getUsername() : "anonymousUser";
        AttendanceCorrectionRequestDTO result = attendanceService.submitCorrectionRequest(requestDTO, username);
        return ResponseEntity.ok(ApiResponse.ok("Correction request submitted for approval", result));
    }

    @GetMapping("/corrections")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER')")
    @Operation(summary = "List attendance correction requests (all or filtered by status)")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionRequestDTO>>> getCorrectionRequests(
            @RequestParam(required = false) RequestStatus status
    ) {
        List<AttendanceCorrectionRequestDTO> requests = attendanceService.getCorrectionRequests(status);
        return ResponseEntity.ok(ApiResponse.ok(requests));
    }

    @PutMapping("/corrections/{id}/review")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER')")
    @Operation(summary = "Manager/HR approval or rejection of attendance correction requests")
    public ResponseEntity<ApiResponse<AttendanceCorrectionRequestDTO>> reviewCorrection(
            @PathVariable Long id,
            @Valid @RequestBody ReviewCorrectionDTO reviewDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = (userDetails != null) ? userDetails.getUsername() : "anonymousUser";
        AttendanceCorrectionRequestDTO result = attendanceService.reviewCorrectionRequest(id, reviewDTO, username);
        return ResponseEntity.ok(ApiResponse.ok("Correction request processed successfully", result));
    }
}
