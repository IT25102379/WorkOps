package com.workops.app.entity;

import com.workops.app.entity.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "attendance_date"}, name = "uk_emp_attendance_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "clock_in_time")
    private LocalDateTime clockInTime;

    @Column(name = "clock_out_time")
    private LocalDateTime clockOutTime;

    @Column(name = "clock_in_latitude", precision = 10, scale = 8)
    private BigDecimal clockInLatitude;

    @Column(name = "clock_in_longitude", precision = 11, scale = 8)
    private BigDecimal clockInLongitude;

    @Column(name = "clock_out_latitude", precision = 10, scale = 8)
    private BigDecimal clockOutLatitude;

    @Column(name = "clock_out_longitude", precision = 11, scale = 8)
    private BigDecimal clockOutLongitude;

    @Column(name = "clock_in_ip", length = 64)
    private String clockInIp;

    @Column(name = "clock_out_ip", length = 64)
    private String clockOutIp;

    @Column(name = "clock_in_user_agent", length = 255)
    private String clockInUserAgent;

    @Column(name = "clock_out_user_agent", length = 255)
    private String clockOutUserAgent;

    @Column(name = "work_duration_minutes", nullable = false)
    @Builder.Default
    private Integer workDurationMinutes = 0;

    @Column(name = "late_minutes", nullable = false)
    @Builder.Default
    private Integer lateMinutes = 0;

    @Column(name = "overtime_minutes", nullable = false)
    @Builder.Default
    private Integer overtimeMinutes = 0;

    @Column(name = "early_departure_minutes", nullable = false)
    @Builder.Default
    private Integer earlyDepartureMinutes = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    @Builder.Default
    private AttendanceStatus status = AttendanceStatus.PRESENT;

    @Column(name = "is_geofence_verified", nullable = false)
    @Builder.Default
    private Boolean isGeofenceVerified = false;

    @Column(length = 500)
    private String remarks;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
