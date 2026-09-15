package com.workops.app.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimeStatusUpdateDTO {
    private String status; // APPROVED, REJECTED, CANCELLED
    private String reviewComment;
    private String approvedBy;
}
