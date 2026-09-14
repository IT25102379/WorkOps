package com.workops.app.entity;

import com.workops.app.entity.enums.EmployeeStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(name = "employee_code", length = 30, unique = true, nullable = false)
    private String employeeCode;

    @Column(name = "first_name", length = 100, nullable = false)
    private String firstName;

    @Column(name = "last_name", length = 100, nullable = false)
    private String lastName;

    @Column(length = 150, unique = true, nullable = false)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(length = 100, nullable = false)
    private String designation;

    @Column(name = "shift_start_time", nullable = false)
    @Builder.Default
    private LocalTime shiftStartTime = LocalTime.of(8, 30);

    @Column(name = "shift_end_time", nullable = false)
    @Builder.Default
    private LocalTime shiftEndTime = LocalTime.of(17, 30);

    @Column(name = "grace_period_minutes", nullable = false)
    @Builder.Default
    private Integer gracePeriodMinutes = 15;

    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 30)
    private String emergencyContactPhone;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getFullName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}
