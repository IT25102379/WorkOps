package com.workops.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "generated_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_title", nullable = false, length = 150)
    private String reportTitle;

    @Column(name = "report_type", nullable = false, length = 20)
    private String reportType;

    @Column(name = "module", nullable = false, length = 50)
    @Builder.Default
    private String module = "ATTENDANCE";

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "record_count")
    private Integer recordCount;

    @Column(name = "filter_criteria", columnDefinition = "TEXT")
    private String filterCriteria;

    @Column(name = "generated_by", length = 100)
    private String generatedBy;

    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "COMPLETED";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
