package com.workops.app.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long userId;
    private Long employeeId;
    private String username;
    private String email;
    private String fullName;
    private String designation;
    private String departmentName;
    private String role;
    private List<String> authorities;
}
