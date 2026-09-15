package com.workops.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payroll", uniqueConstraints = {
        @UniqueConstraint(name = "uk_payroll_emp_month_year", columnNames = {"employee_id", "payroll_month", "payroll_year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "payroll_month", nullable = false)
    private Integer payrollMonth;

    @Column(name = "payroll_year", nullable = false)
    private Integer payrollYear;

    @Column(name = "basic_salary", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal basicSalary = BigDecimal.ZERO;

    @Column(name = "overtime_pay", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal overtimePay = BigDecimal.ZERO;

    @Column(name = "allowances", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal allowances = BigDecimal.ZERO;

    @Column(name = "deductions", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal deductions = BigDecimal.ZERO;

    @Column(name = "tax", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(name = "net_salary", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal netSalary = BigDecimal.ZERO;

    @Column(name = "payment_status", length = 30, nullable = false)
    @Builder.Default
    private String paymentStatus = "DRAFT"; // DRAFT, PROCESSED, PAID

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
