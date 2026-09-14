package com.workops.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthRequest {

    @NotBlank(message = "Username or Email is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}
