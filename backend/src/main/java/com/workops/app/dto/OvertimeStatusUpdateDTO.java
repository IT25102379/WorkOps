package com.workops.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimeStatusUpdateDTO {

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "APPROVED|REJECTED|CANCELLED|PENDING", message = "Status must be APPROVED, REJECTED, CANCELLED, or PENDING")
    private String status;

    @Size(max = 1000, message = "Review comment must not exceed 1000 characters")
    private String reviewComment;

    @Size(max = 100, message = "Approved by name is too long")
    private String approvedBy;
}
