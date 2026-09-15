package com.workops.app.controller;

import com.workops.app.dto.ApiResponse;
import com.workops.app.dto.AuthRequest;
import com.workops.app.dto.AuthResponse;
import com.workops.app.dto.SignupRequest;
import com.workops.app.dto.AccountSummaryDTO;
import com.workops.app.entity.Employee;
import com.workops.app.entity.User;
import com.workops.app.repository.EmployeeRepository;
import com.workops.app.repository.UserRepository;
import com.workops.app.security.JwtUtils;
import com.workops.app.security.UserPrincipal;
import com.workops.app.service.UserAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user login, JWT tokens, and identity management")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final UserAccountService userAccountService;

    @PostMapping("/signup")
    @Operation(summary = "Create an employee account and profile")
    public ResponseEntity<ApiResponse<AccountSummaryDTO>> signup(@Valid @RequestBody SignupRequest signupRequest) {
        AccountSummaryDTO account = userAccountService.registerEmployee(signupRequest);
        return ResponseEntity.ok(ApiResponse.ok("Employee account created", account));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and return JWT Bearer token")
    public ResponseEntity<ApiResponse<AuthResponse>> authenticateUser(@Valid @RequestBody AuthRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateToken(authentication);

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        User user = userRepository.findById(userPrincipal.getId()).orElse(null);
        if (user != null) {
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
        }

        Employee employee = employeeRepository.findByUserId(userPrincipal.getId()).orElse(null);

        AuthResponse response = AuthResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .userId(userPrincipal.getId())
                .employeeId(employee != null ? employee.getId() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .username(userPrincipal.getUsername())
                .email(userPrincipal.getEmail())
                .phone(employee != null ? employee.getPhone() : null)
                .fullName(employee != null ? employee.getFullName() : userPrincipal.getUsername())
                .designation(employee != null ? employee.getDesignation() : "System User")
                .departmentName(employee != null && employee.getDepartment() != null ? employee.getDepartment().getName() : "N/A")
                .role(!roles.isEmpty() ? roles.get(0) : "ROLE_STAFF")
                .authorities(roles)
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<ApiResponse<AuthResponse>> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated"));
        }

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        Employee employee = employeeRepository.findByUserId(principal.getId()).orElse(null);

        List<String> roles = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        AuthResponse response = AuthResponse.builder()
                .userId(principal.getId())
                .employeeId(employee != null ? employee.getId() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .username(principal.getUsername())
                .email(principal.getEmail())
                .phone(employee != null ? employee.getPhone() : null)
                .fullName(employee != null ? employee.getFullName() : principal.getUsername())
                .designation(employee != null ? employee.getDesignation() : "System User")
                .departmentName(employee != null && employee.getDepartment() != null ? employee.getDepartment().getName() : "N/A")
                .role(!roles.isEmpty() ? roles.get(0) : "ROLE_STAFF")
                .authorities(roles)
                .build();

        return ResponseEntity.ok(ApiResponse.ok("User profile retrieved", response));
    }
}
