package com.workops.app.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollAdjustmentDTO {

    @NotNull(message = "Allowances amount is required")
    @DecimalMin(value = "0.0", message = "Allowances cannot be negative")
    @DecimalMax(value = "10000000.0", message = "Allowances amount exceeds maximum permissible limit")
    private BigDecimal allowances;

    @NotNull(message = "Overtime pay amount is required")
    @DecimalMin(value = "0.0", message = "Overtime pay cannot be negative")
    @DecimalMax(value = "10000000.0", message = "Overtime pay exceeds maximum permissible limit")
    private BigDecimal overtimePay;

    @DecimalMin(value = "0.0", message = "Basic salary cannot be negative")
    private BigDecimal basicSalary;

    @DecimalMin(value = "0.0", message = "Deductions cannot be negative")
    private BigDecimal deductions;

    private Integer payrollMonth;
    private Integer payrollYear;
    private Long employeeId;
}
