package com.workops.app.service;

import com.workops.app.dto.*;
import com.workops.app.entity.enums.RequestStatus;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceService {

    AttendanceResponseDTO clockIn(ClockInRequest request, String username, HttpServletRequest servletRequest);

    AttendanceResponseDTO clockOut(ClockOutRequest request, String username, HttpServletRequest servletRequest);

    TodayStatusDTO getTodayStatus(String username);

    List<AttendanceResponseDTO> getFilteredAttendance(AttendanceFilterDTO filterDTO);

    AttendanceKpiDTO getAttendanceKpis(LocalDate date);

    AttendanceCorrectionRequestDTO submitCorrectionRequest(AttendanceCorrectionRequestDTO requestDTO, String username);

    List<AttendanceCorrectionRequestDTO> getCorrectionRequests(RequestStatus status);

    AttendanceCorrectionRequestDTO reviewCorrectionRequest(Long requestId, ReviewCorrectionDTO reviewDTO, String reviewerUsername);
}
