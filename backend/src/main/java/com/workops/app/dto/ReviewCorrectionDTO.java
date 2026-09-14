package com.workops.app.dto;

import com.workops.app.entity.enums.RequestStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewCorrectionDTO {

    @NotNull(message = "Review status (APPROVED or REJECTED) is required")
    private RequestStatus status;

    private String reviewComment;
}
