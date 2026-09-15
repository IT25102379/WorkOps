package com.workops.app.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRunRequestDTO {

    private Integer payrollMonth;
    private Integer payrollYear;
    private Long departmentId; // null = all departments
    private BigDecimal allowanceMultiplier; // default 1.0
    private Boolean includeOvertime; // default true
    private BigDecimal bonusAmount;
}
