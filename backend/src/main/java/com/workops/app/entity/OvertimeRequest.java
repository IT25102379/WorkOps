package com.workops.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "overtime_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "employee_code", length = 50)
    private String employeeCode;

    @Column(name = "employee_name", length = 150)
    private String employeeName;

    @Column(name = "department_name", length = 100)
    private String departmentName;

    @Column(name = "ot_date", nullable = false)
    private LocalDate otDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "ot_hours", precision = 4, scale = 2, nullable = false)
    private BigDecimal otHours;

    @Column(name = "multiplier_rate", precision = 3, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal multiplierRate = new BigDecimal("1.50");

    @Column(name = "task_description", length = 500)
    private String taskDescription;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(length = 30, nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
