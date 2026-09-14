package com.workops.app.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceKpiDTO {

    private long totalEmployees;
    private long totalPresentToday;
    private long lateArrivalsCount;
    private long onTimeCount;
    private double onTimePercentage;
    private double totalOvertimeHours;
    private long halfDayCount;
    private long absentCount;
    private long pendingCorrectionRequests;
}
