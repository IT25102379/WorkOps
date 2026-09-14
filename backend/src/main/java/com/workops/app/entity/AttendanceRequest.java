package com.workops.app.entity;

import com.workops.app.entity.enums.RequestStatus;
import com.workops.app.entity.enums.RequestType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    private Attendance attendance;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", length = 30, nullable = false)
    private RequestType requestType;

    @Column(name = "requested_date", nullable = false)
    private LocalDate requestedDate;

    @Column(name = "requested_clock_in")
    private LocalDateTime requestedClockIn;

    @Column(name = "requested_clock_out")
    private LocalDateTime requestedClockOut;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "review_comment", columnDefinition = "TEXT")
    private String reviewComment;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
