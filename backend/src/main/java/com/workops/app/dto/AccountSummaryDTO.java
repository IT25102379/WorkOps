package com.workops.app.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AccountSummaryDTO {
    private Long userId;
    private Long employeeId;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private String departmentName;
    private String designation;
    private Boolean active;
    private LocalDateTime lastLoginAt;
}
