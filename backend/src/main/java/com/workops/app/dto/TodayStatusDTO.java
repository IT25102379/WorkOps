package com.workops.app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodayStatusDTO {

    private Long attendanceId;
    private Long employeeId;
    private String employeeName;
    private String employeeCode;
    private String departmentName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate todayDate;

    @com.fasterxml.jackson.annotation.JsonProperty("isClockedIn")
    private boolean isClockedIn;

    @com.fasterxml.jackson.annotation.JsonProperty("isClockedOut")
    private boolean isClockedOut;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime clockInTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime clockOutTime;

    private Long elapsedSeconds;
    private String elapsedFormatted; // e.g. "04h 23m 12s"

    @JsonFormat(pattern = "HH:mm")
    private LocalTime shiftStartTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime shiftEndTime;

    private Integer gracePeriodMinutes;
    private String currentStatus;
    private Boolean isGeofenceVerified;

    // Department coordinates for client verification
    private BigDecimal officeLatitude;
    private BigDecimal officeLongitude;
    private Integer officeRadiusMeters;
}
