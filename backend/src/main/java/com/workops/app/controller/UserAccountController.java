package com.workops.app.controller;

import com.workops.app.dto.AccountSummaryDTO;
import com.workops.app.dto.ApiResponse;
import com.workops.app.service.UserAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Accounts", description = "Employee account status and access management")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
public class UserAccountController {

    private final UserAccountService userAccountService;

    @GetMapping
    @Operation(summary = "List employee user accounts")
    public ResponseEntity<ApiResponse<List<AccountSummaryDTO>>> getAccounts() {
        return ResponseEntity.ok(ApiResponse.ok("User accounts retrieved", userAccountService.getAccounts()));
    }

    @PatchMapping("/{userId}/status")
    @Operation(summary = "Activate or deactivate an employee account")
    public ResponseEntity<ApiResponse<AccountSummaryDTO>> setStatus(
            @PathVariable Long userId,
            @RequestParam boolean active
    ) {
        AccountSummaryDTO account = userAccountService.setActive(userId, active);
        return ResponseEntity.ok(ApiResponse.ok(active ? "Account activated" : "Account deactivated", account));
    }
}
