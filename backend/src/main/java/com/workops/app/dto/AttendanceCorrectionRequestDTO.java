package com.workops.app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workops.app.entity.enums.RequestStatus;
import com.workops.app.entity.enums.RequestType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceCorrectionRequestDTO {

    private Long id;
    private Long attendanceId;
    private Long employeeId;
    private String employeeName;
    private String employeeCode;
    private String departmentName;

    @NotNull(message = "Request type is required")
    private RequestType requestType;

    @NotNull(message = "Requested date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate requestedDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime requestedClockIn;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime requestedClockOut;

    @NotBlank(message = "Reason for attendance correction is required")
    @Size(min = 10, max = 1000, message = "Reason must provide adequate detail between 10 and 1000 characters")
    private String reason;

    private RequestStatus status;
    private String reviewedByName;

    @Size(max = 1000, message = "Review comment must not exceed 1000 characters")
    private String reviewComment;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime reviewedAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
