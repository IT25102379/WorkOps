package com.workops.app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceResponseDTO {

    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String departmentName;
    private String designation;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate attendanceDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime clockInTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime clockOutTime;

    private BigDecimal clockInLatitude;
    private BigDecimal clockInLongitude;
    private BigDecimal clockOutLatitude;
    private BigDecimal clockOutLongitude;

    private String clockInIp;
    private String clockOutIp;
    private String clockInUserAgent;
    private String clockOutUserAgent;

    private Integer workDurationMinutes;
    private Integer lateMinutes;
    private Integer overtimeMinutes;
    private Integer earlyDepartureMinutes;

    private String status;
    private Boolean isGeofenceVerified;
    private String remarks;

    // Helper formatted strings
    private String formattedDuration;
    private String formattedShiftTime;
}
