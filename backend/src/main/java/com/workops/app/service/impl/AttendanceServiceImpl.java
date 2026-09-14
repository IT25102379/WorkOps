package com.workops.app.service.impl;

import com.workops.app.dto.*;
import com.workops.app.entity.*;
import com.workops.app.entity.enums.AttendanceStatus;
import com.workops.app.entity.enums.EmployeeStatus;
import com.workops.app.entity.enums.RequestStatus;
import com.workops.app.exception.BadRequestException;
import com.workops.app.exception.GeofenceException;
import com.workops.app.exception.ResourceNotFoundException;
import com.workops.app.repository.*;
import com.workops.app.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AttendanceRequestRepository attendanceRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    @Value("${workops.geofence.enforce-verification:false}")
    private boolean enforceGeofence;

    private static final int STANDARD_SHIFT_WORK_MINUTES = 480; // 8 Hours standard
    private static final int HALF_DAY_THRESHOLD_MINUTES = 240;  // 4 Hours

    @Override
    @Transactional
    public AttendanceResponseDTO clockIn(ClockInRequest request, String username, HttpServletRequest servletRequest) {
        Employee employee = resolveEmployee(request.getEmployeeId(), username);
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // 1. Check if already clocked in today
        attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), today)
                .ifPresent(existing -> {
                    if (existing.getClockInTime() != null) {
                        throw new BadRequestException("You have already clocked in today at " + existing.getClockInTime().toLocalTime());
                    }
                });

        // 2. Validate Geolocation against Department Office Geofence
        Department dept = employee.getDepartment();
        double distanceMeters = calculateHaversineDistance(
                request.getLatitude().doubleValue(),
                request.getLongitude().doubleValue(),
                dept.getOfficeLatitude().doubleValue(),
                dept.getOfficeLongitude().doubleValue()
        );

        boolean isGeofenceValid = distanceMeters <= dept.getGeofenceRadiusMeters();
        log.info("Clock-in geolocation check: Employee {} is {} meters away from office geofence (Allowed: {}m)",
                employee.getEmployeeCode(), (int) distanceMeters, dept.getGeofenceRadiusMeters());

        if (enforceGeofence && !isGeofenceValid) {
            throw new GeofenceException(String.format(
                    "Clock-in rejected: You are %.0fm away from the designated office location (Max permitted radius: %dm)",
                    distanceMeters, dept.getGeofenceRadiusMeters()));
        }

        // 3. Automated Status & Grace Period Engine
        LocalTime shiftStart = employee.getShiftStartTime();
        int graceMinutes = employee.getGracePeriodMinutes();
        LocalTime graceLimit = shiftStart.plusMinutes(graceMinutes);

        LocalTime clockInTime = now.toLocalTime();
        AttendanceStatus calculatedStatus;
        int lateMinutes = 0;

        if (clockInTime.isAfter(graceLimit)) {
            calculatedStatus = AttendanceStatus.LATE_ARRIVAL;
            lateMinutes = (int) Duration.between(shiftStart, clockInTime).toMinutes();
        } else {
            calculatedStatus = AttendanceStatus.PRESENT;
        }

        // 4. Extract IP and User Agent for Security Audit Trail
        String clientIp = extractClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        // 5. Persist Attendance Record
        Attendance attendance = Attendance.builder()
                .employee(employee)
                .attendanceDate(today)
                .clockInTime(now)
                .clockInLatitude(request.getLatitude())
                .clockInLongitude(request.getLongitude())
                .clockInIp(clientIp)
                .clockInUserAgent(userAgent)
                .lateMinutes(lateMinutes)
                .status(calculatedStatus)
                .isGeofenceVerified(isGeofenceValid)
                .remarks(request.getRemarks() != null ? request.getRemarks() : "Clocked in via WorkOps Web Portal")
                .build();

        Attendance saved = attendanceRepository.save(attendance);
        log.info("Employee {} successfully clocked in. Status: {}, Late Minutes: {}",
                employee.getEmployeeCode(), calculatedStatus, lateMinutes);

        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public AttendanceResponseDTO clockOut(ClockOutRequest request, String username, HttpServletRequest servletRequest) {
        Employee employee = resolveEmployee(request.getEmployeeId(), username);
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // 1. Locate today's clock-in record
        Attendance attendance = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), today)
                .orElseThrow(() -> new BadRequestException("No clock-in record found for today. Please clock in first."));

        if (attendance.getClockOutTime() != null) {
            throw new BadRequestException("You have already clocked out today at " + attendance.getClockOutTime().toLocalTime());
        }

        // 2. Validate Geolocation for Clock-Out
        Department dept = employee.getDepartment();
        double distanceMeters = calculateHaversineDistance(
                request.getLatitude().doubleValue(),
                request.getLongitude().doubleValue(),
                dept.getOfficeLatitude().doubleValue(),
                dept.getOfficeLongitude().doubleValue()
        );
        boolean isGeofenceValid = distanceMeters <= dept.getGeofenceRadiusMeters();

        // 3. Compute Duration, Overtime, Early Departure, and Status
        attendance.setClockOutTime(now);
        attendance.setClockOutLatitude(request.getLatitude());
        attendance.setClockOutLongitude(request.getLongitude());
        attendance.setClockOutIp(extractClientIp(servletRequest));
        attendance.setClockOutUserAgent(servletRequest.getHeader("User-Agent"));

        int workDurationMinutes = (int) Duration.between(attendance.getClockInTime(), now).toMinutes();
        attendance.setWorkDurationMinutes(workDurationMinutes);

        // Check early departure
        LocalTime clockOutTime = now.toLocalTime();
        if (clockOutTime.isBefore(employee.getShiftEndTime())) {
            int earlyMinutes = (int) Duration.between(clockOutTime, employee.getShiftEndTime()).toMinutes();
            attendance.setEarlyDepartureMinutes(earlyMinutes);
        }

        // Overtime calculation (Standard 8 hours = 480 mins)
        if (workDurationMinutes > STANDARD_SHIFT_WORK_MINUTES) {
            int overtime = workDurationMinutes - STANDARD_SHIFT_WORK_MINUTES;
            attendance.setOvertimeMinutes(overtime);
            if (attendance.getStatus() != AttendanceStatus.LATE_ARRIVAL) {
                attendance.setStatus(AttendanceStatus.OVERTIME);
            }
        } else if (workDurationMinutes < HALF_DAY_THRESHOLD_MINUTES) {
            attendance.setStatus(AttendanceStatus.HALF_DAY);
        }

        if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
            attendance.setRemarks(attendance.getRemarks() + " | Clock-out: " + request.getRemarks());
        }

        Attendance saved = attendanceRepository.save(attendance);
        log.info("Employee {} successfully clocked out. Total Work: {} mins, Overtime: {} mins",
                employee.getEmployeeCode(), workDurationMinutes, saved.getOvertimeMinutes());

        return mapToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public TodayStatusDTO getTodayStatus(String username) {
        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Employee employee = employeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found for user: " + username));

        LocalDate today = LocalDate.now();
        Department dept = employee.getDepartment();

        TodayStatusDTO.TodayStatusDTOBuilder builder = TodayStatusDTO.builder()
                .employeeId(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .employeeName(employee.getFullName())
                .departmentName(dept != null ? dept.getName() : "N/A")
                .todayDate(today)
                .shiftStartTime(employee.getShiftStartTime())
                .shiftEndTime(employee.getShiftEndTime())
                .gracePeriodMinutes(employee.getGracePeriodMinutes())
                .officeLatitude(dept != null ? dept.getOfficeLatitude() : null)
                .officeLongitude(dept != null ? dept.getOfficeLongitude() : null)
                .officeRadiusMeters(dept != null ? dept.getGeofenceRadiusMeters() : 350);

        attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), today)
                .ifPresentOrElse(attendance -> {
                    builder.attendanceId(attendance.getId())
                            .isClockedIn(attendance.getClockInTime() != null)
                            .isClockedOut(attendance.getClockOutTime() != null)
                            .clockInTime(attendance.getClockInTime())
                            .clockOutTime(attendance.getClockOutTime())
                            .currentStatus(attendance.getStatus().name())
                            .isGeofenceVerified(attendance.getIsGeofenceVerified());

                    if (attendance.getClockInTime() != null && attendance.getClockOutTime() == null) {
                        long elapsedSec = Duration.between(attendance.getClockInTime(), LocalDateTime.now()).getSeconds();
                        builder.elapsedSeconds(Math.max(0, elapsedSec))
                               .elapsedFormatted(formatDuration(elapsedSec));
                    } else if (attendance.getClockInTime() != null && attendance.getClockOutTime() != null) {
                        long totalSec = Duration.between(attendance.getClockInTime(), attendance.getClockOutTime()).getSeconds();
                        builder.elapsedSeconds(totalSec)
                               .elapsedFormatted(formatDuration(totalSec));
                    }
                }, () -> {
                    builder.isClockedIn(false)
                            .isClockedOut(false)
                            .elapsedSeconds(0L)
                            .elapsedFormatted("00h 00m 00s")
                            .currentStatus("NOT_CLOCKED_IN");
                });

        return builder.build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceResponseDTO> getFilteredAttendance(AttendanceFilterDTO filterDTO) {
        if (filterDTO == null) {
            filterDTO = new AttendanceFilterDTO();
        }

        List<Attendance> records = attendanceRepository.filterAttendance(
                filterDTO.getStartDate(),
                filterDTO.getEndDate(),
                filterDTO.getDepartmentId(),
                filterDTO.getEmployeeId(),
                filterDTO.getStatus(),
                filterDTO.getSearch()
        );

        return records.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceKpiDTO getAttendanceKpis(LocalDate targetDate) {
        LocalDate date = (targetDate != null) ? targetDate : LocalDate.now();

        long totalEmployees = employeeRepository.countByStatus(EmployeeStatus.ACTIVE);
        long totalPresentToday = attendanceRepository.countByAttendanceDate(date);
        long lateArrivalsCount = attendanceRepository.countByAttendanceDateAndStatus(date, AttendanceStatus.LATE_ARRIVAL);
        long halfDayCount = attendanceRepository.countByAttendanceDateAndStatus(date, AttendanceStatus.HALF_DAY);
        long onTimeCount = Math.max(0, totalPresentToday - lateArrivalsCount);
        double onTimePercentage = totalPresentToday > 0 ? ((double) onTimeCount / totalPresentToday) * 100.0 : 100.0;

        Long totalOvertimeMins = attendanceRepository.sumOvertimeMinutesByDate(date);
        double totalOvertimeHours = (totalOvertimeMins != null ? totalOvertimeMins : 0L) / 60.0;

        long absentCount = Math.max(0, totalEmployees - totalPresentToday);
        long pendingCorrections = attendanceRequestRepository.countByStatus(RequestStatus.PENDING);

        return AttendanceKpiDTO.builder()
                .totalEmployees(totalEmployees)
                .totalPresentToday(totalPresentToday)
                .lateArrivalsCount(lateArrivalsCount)
                .onTimeCount(onTimeCount)
                .onTimePercentage(Math.round(onTimePercentage * 10.0) / 10.0)
                .totalOvertimeHours(Math.round(totalOvertimeHours * 10.0) / 10.0)
                .halfDayCount(halfDayCount)
                .absentCount(absentCount)
                .pendingCorrectionRequests(pendingCorrections)
                .build();
    }

    @Override
    @Transactional
    public AttendanceCorrectionRequestDTO submitCorrectionRequest(AttendanceCorrectionRequestDTO dto, String username) {
        Employee employee = resolveEmployee(dto.getEmployeeId(), username);

        Attendance attendance = null;
        if (dto.getAttendanceId() != null) {
            attendance = attendanceRepository.findById(dto.getAttendanceId()).orElse(null);
        }

        AttendanceRequest request = AttendanceRequest.builder()
                .attendance(attendance)
                .employee(employee)
                .requestType(dto.getRequestType())
                .requestedDate(dto.getRequestedDate())
                .requestedClockIn(dto.getRequestedClockIn())
                .requestedClockOut(dto.getRequestedClockOut())
                .reason(dto.getReason())
                .status(RequestStatus.PENDING)
                .build();

        AttendanceRequest saved = attendanceRequestRepository.save(request);
        log.info("Correction request submitted by employee {} for date {}", employee.getEmployeeCode(), dto.getRequestedDate());

        return mapCorrectionToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceCorrectionRequestDTO> getCorrectionRequests(RequestStatus status) {
        List<AttendanceRequest> list;
        if (status != null) {
            list = attendanceRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            list = attendanceRequestRepository.findAllByOrderByCreatedAtDesc();
        }

        return list.stream().map(this::mapCorrectionToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AttendanceCorrectionRequestDTO reviewCorrectionRequest(Long requestId, ReviewCorrectionDTO reviewDTO, String reviewerUsername) {
        AttendanceRequest request = attendanceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance correction request not found with ID: " + requestId));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request is already finalized with status: " + request.getStatus());
        }

        User reviewer = userRepository.findByUsernameOrEmail(reviewerUsername, reviewerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer user not found: " + reviewerUsername));

        request.setStatus(reviewDTO.getStatus());
        request.setReviewedBy(reviewer);
        request.setReviewComment(reviewDTO.getReviewComment());
        request.setReviewedAt(LocalDateTime.now());

        // If Approved, apply corrections to Attendance table
        if (reviewDTO.getStatus() == RequestStatus.APPROVED) {
            applyApprovedCorrection(request);
        }

        AttendanceRequest saved = attendanceRequestRepository.save(request);
        return mapCorrectionToDTO(saved);
    }

    private void applyApprovedCorrection(AttendanceRequest request) {
        Employee employee = request.getEmployee();
        LocalDate date = request.getRequestedDate();

        Attendance attendance = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), date)
                .orElseGet(() -> Attendance.builder()
                        .employee(employee)
                        .attendanceDate(date)
                        .remarks("Created via approved correction request #" + request.getId())
                        .build());

        if (request.getRequestedClockIn() != null) {
            attendance.setClockInTime(request.getRequestedClockIn());
            // Recalculate late arrival
            LocalTime shiftStart = employee.getShiftStartTime();
            LocalTime graceLimit = shiftStart.plusMinutes(employee.getGracePeriodMinutes());
            LocalTime clockIn = request.getRequestedClockIn().toLocalTime();

            if (clockIn.isAfter(graceLimit)) {
                attendance.setStatus(AttendanceStatus.LATE_ARRIVAL);
                attendance.setLateMinutes((int) Duration.between(shiftStart, clockIn).toMinutes());
            } else {
                attendance.setStatus(AttendanceStatus.PRESENT);
                attendance.setLateMinutes(0);
            }
        }

        if (request.getRequestedClockOut() != null) {
            attendance.setClockOutTime(request.getRequestedClockOut());
        }

        if (attendance.getClockInTime() != null && attendance.getClockOutTime() != null) {
            int duration = (int) Duration.between(attendance.getClockInTime(), attendance.getClockOutTime()).toMinutes();
            attendance.setWorkDurationMinutes(duration);
            if (duration > STANDARD_SHIFT_WORK_MINUTES) {
                attendance.setOvertimeMinutes(duration - STANDARD_SHIFT_WORK_MINUTES);
                if (attendance.getStatus() != AttendanceStatus.LATE_ARRIVAL) {
                    attendance.setStatus(AttendanceStatus.OVERTIME);
                }
            }
        }

        attendance.setIsGeofenceVerified(true);
        attendanceRepository.save(attendance);
        log.info("Successfully updated Attendance record for employee {} on date {}", employee.getEmployeeCode(), date);
    }

    // Helper Methods
    private Employee resolveEmployee(Long employeeId, String username) {
        if (employeeId != null) {
            return employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + employeeId));
        }

        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        return employeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not linked to user: " + username));
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Earth's radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || "unknown".equalsIgnoreCase(xfHeader)) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }

    private String formatDuration(long totalSeconds) {
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        return String.format("%02dh %02dm %02ds", hours, minutes, seconds);
    }

    private AttendanceResponseDTO mapToDTO(Attendance a) {
        Employee e = a.getEmployee();
        Department d = (e != null) ? e.getDepartment() : null;

        String formattedDuration = "0h 0m";
        if (a.getWorkDurationMinutes() != null && a.getWorkDurationMinutes() > 0) {
            int hrs = a.getWorkDurationMinutes() / 60;
            int mins = a.getWorkDurationMinutes() % 60;
            formattedDuration = String.format("%dh %02dm", hrs, mins);
        }

        return AttendanceResponseDTO.builder()
                .id(a.getId())
                .employeeId(e != null ? e.getId() : null)
                .employeeCode(e != null ? e.getEmployeeCode() : "N/A")
                .employeeName(e != null ? e.getFullName() : "N/A")
                .departmentName(d != null ? d.getName() : "N/A")
                .designation(e != null ? e.getDesignation() : "N/A")
                .attendanceDate(a.getAttendanceDate())
                .clockInTime(a.getClockInTime())
                .clockOutTime(a.getClockOutTime())
                .clockInLatitude(a.getClockInLatitude())
                .clockInLongitude(a.getClockInLongitude())
                .clockOutLatitude(a.getClockOutLatitude())
                .clockOutLongitude(a.getClockOutLongitude())
                .clockInIp(a.getClockInIp())
                .clockOutIp(a.getClockOutIp())
                .clockInUserAgent(a.getClockInUserAgent())
                .clockOutUserAgent(a.getClockOutUserAgent())
                .workDurationMinutes(a.getWorkDurationMinutes())
                .lateMinutes(a.getLateMinutes())
                .overtimeMinutes(a.getOvertimeMinutes())
                .earlyDepartureMinutes(a.getEarlyDepartureMinutes())
                .status(a.getStatus().name())
                .isGeofenceVerified(a.getIsGeofenceVerified())
                .remarks(a.getRemarks())
                .formattedDuration(formattedDuration)
                .build();
    }

    private AttendanceCorrectionRequestDTO mapCorrectionToDTO(AttendanceRequest r) {
        Employee e = r.getEmployee();
        Department d = (e != null) ? e.getDepartment() : null;
        User reviewer = r.getReviewedBy();

        return AttendanceCorrectionRequestDTO.builder()
                .id(r.getId())
                .attendanceId(r.getAttendance() != null ? r.getAttendance().getId() : null)
                .employeeId(e != null ? e.getId() : null)
                .employeeCode(e != null ? e.getEmployeeCode() : "N/A")
                .employeeName(e != null ? e.getFullName() : "N/A")
                .departmentName(d != null ? d.getName() : "N/A")
                .requestType(r.getRequestType())
                .requestedDate(r.getRequestedDate())
                .requestedClockIn(r.getRequestedClockIn())
                .requestedClockOut(r.getRequestedClockOut())
                .reason(r.getReason())
                .status(r.getStatus())
                .reviewedByName(reviewer != null ? reviewer.getUsername() : null)
                .reviewComment(r.getReviewComment())
                .reviewedAt(r.getReviewedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
