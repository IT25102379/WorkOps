package com.workops.app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollEventDTO {

    private Long id;
    private String title;
    private String eventType;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate eventDate;

    private String description;
    private String priority;
    private String createdBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
