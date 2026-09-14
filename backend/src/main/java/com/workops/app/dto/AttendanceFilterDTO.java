package com.workops.app.dto;

import com.workops.app.entity.enums.AttendanceStatus;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceFilterDTO {

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    private Long departmentId;
    private Long employeeId;
    private AttendanceStatus status;
    private String search;
}
