package com.workops.app.dto;

import com.workops.app.entity.enums.RequestStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewCorrectionDTO {

    @NotNull(message = "Review status (APPROVED or REJECTED) is required")
    private RequestStatus status;

    @Size(max = 1000, message = "Review comment must not exceed 1000 characters")
    private String reviewComment;
}
