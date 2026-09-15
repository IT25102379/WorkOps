package com.workops.app.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollOvertimeSummaryDTO {

    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String departmentName;
    private BigDecimal basicSalary;
    private BigDecimal approvedOtHours;
    private BigDecimal hourlyOtRate;
    private BigDecimal totalOtPayout;
    private Integer totalApprovedRecords;
}
