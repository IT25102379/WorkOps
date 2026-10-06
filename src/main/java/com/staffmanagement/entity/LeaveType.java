package com.staffmanagement.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Table(name = "LEAVE_TYPE")
@Data
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_type_id")
    private Long leaveTypeId;

    @Column(name = "leave_type_name", nullable = false, unique = true)
    private String leaveTypeName;

    @Column(name = "default_days", nullable = false)
    private Integer defaultDays;

    @Column(name = "description")
    private String description;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @OneToMany(mappedBy = "leaveType")
    private List<LeaveRequest> leaveRequests;
    
    @OneToMany(mappedBy = "leaveType")
    private List<LeaveBalance> leaveBalances;
}
