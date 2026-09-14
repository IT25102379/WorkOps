package com.workops.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dept_code", length = 20, unique = true, nullable = false)
    private String deptCode;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "office_latitude", precision = 10, scale = 8, nullable = false)
    @Builder.Default
    private BigDecimal officeLatitude = new BigDecimal("6.92707900");

    @Column(name = "office_longitude", precision = 11, scale = 8, nullable = false)
    @Builder.Default
    private BigDecimal officeLongitude = new BigDecimal("79.86124400");

    @Column(name = "geofence_radius_meters", nullable = false)
    @Builder.Default
    private Integer geofenceRadiusMeters = 350;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
