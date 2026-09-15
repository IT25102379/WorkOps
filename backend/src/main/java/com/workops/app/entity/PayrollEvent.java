package com.workops.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payroll_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "event_type", nullable = false, length = 50)
    @Builder.Default
    private String eventType = "PAYROLL_CUTOFF"; // PAYROLL_CUTOFF, SALARY_PAYOUT, TAX_FILING, BONUS_PAY, HOLIDAY

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(length = 500)
    private String description;

    @Column(length = 20, nullable = false)
    @Builder.Default
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
