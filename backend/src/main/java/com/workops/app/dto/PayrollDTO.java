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
public class PayrollDTO {

    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String departmentName;
    private String designation;
    private String email;

    private Integer payrollMonth;
    private Integer payrollYear;
    private BigDecimal basicSalary;
    private BigDecimal overtimePay;
    private BigDecimal allowances;
    private BigDecimal deductions;
    private BigDecimal tax;
    private BigDecimal netSalary;
    private String paymentStatus;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate paymentDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
