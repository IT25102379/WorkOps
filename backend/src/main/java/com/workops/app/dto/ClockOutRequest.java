package com.workops.app.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClockOutRequest {

    private Long employeeId; // Optional if derived from authenticated user token

    @NotNull(message = "Latitude is required for geofence verification")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required for geofence verification")
    private BigDecimal longitude;

    private String remarks;
}
