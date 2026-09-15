package com.workops.app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
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
public class OvertimeRequestDTO {

    private Long id;

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotBlank(message = "Employee code is required")
    @Size(max = 30, message = "Employee code must not exceed 30 characters")
    private String employeeCode;

    @Size(max = 150, message = "Employee name must not exceed 150 characters")
    private String employeeName;

    @Size(max = 100, message = "Department name must not exceed 100 characters")
    private String departmentName;

    @NotNull(message = "Overtime date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate otDate;

    @NotNull(message = "Start time is required")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    @NotNull(message = "Overtime hours must be specified")
    @DecimalMin(value = "0.5", message = "Minimum overtime duration is 0.5 hours (30 minutes)")
    @DecimalMax(value = "24.0", message = "Maximum overtime duration cannot exceed 24 hours")
    private BigDecimal otHours;

    @NotNull(message = "Multiplier rate is required")
    @DecimalMin(value = "1.0", message = "Multiplier rate cannot be less than 1.0x")
    @DecimalMax(value = "3.0", message = "Multiplier rate cannot exceed 3.0x")
    private BigDecimal multiplierRate;

    @NotBlank(message = "Task or project description is required")
    @Size(min = 5, max = 500, message = "Task description must be between 5 and 500 characters")
    private String taskDescription;

    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;

    @Pattern(regexp = "PENDING|APPROVED|REJECTED|CANCELLED", message = "Status must be PENDING, APPROVED, REJECTED, or CANCELLED")
    private String status;

    private String createdBy;
    private String approvedBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime approvedAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
