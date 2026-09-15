package com.workops.app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedReportDTO {
    private Long id;
    private String reportTitle;
    private String reportType;
    private String module;
    private String fileName;
    private Integer recordCount;
    private String filterCriteria;
    private String generatedBy;
    private String status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
