package com.workops.app.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRunRequestDTO {

    @NotNull(message = "Payroll month is required")
    @Min(value = 1, message = "Payroll month must be between 1 and 12")
    @Max(value = 12, message = "Payroll month must be between 1 and 12")
    private Integer payrollMonth;

    @NotNull(message = "Payroll year is required")
    @Min(value = 2020, message = "Payroll year must be 2020 or later")
    @Max(value = 2100, message = "Payroll year cannot exceed 2100")
    private Integer payrollYear;

    private Long departmentId; // null = all departments

    @DecimalMin(value = "0.0", message = "Allowance multiplier cannot be negative")
    @DecimalMax(value = "5.0", message = "Allowance multiplier cannot exceed 5.0")
    private BigDecimal allowanceMultiplier; // default 1.0

    private Boolean includeOvertime; // default true

    @PositiveOrZero(message = "Bonus amount cannot be negative")
    private BigDecimal bonusAmount;
}
