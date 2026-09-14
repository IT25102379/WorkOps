package com.staffmanagement.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "LEAVE_BALANCE")
@Data
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_balance_id")
    private Long leaveBalanceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "allocated_days", nullable = false)
    private Integer allocatedDays;

    @Column(name = "used_days", nullable = false)
    private Integer usedDays = 0;

    @Column(name = "remaining_days", nullable = false)
    private Integer remainingDays;
}
