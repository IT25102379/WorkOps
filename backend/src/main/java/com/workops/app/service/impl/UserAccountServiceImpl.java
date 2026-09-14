package com.workops.app.service.impl;

import com.workops.app.dto.AccountSummaryDTO;
import com.workops.app.dto.SignupRequest;
import com.workops.app.entity.Department;
import com.workops.app.entity.Employee;
import com.workops.app.entity.Role;
import com.workops.app.entity.User;
import com.workops.app.entity.enums.EmployeeStatus;
import com.workops.app.entity.enums.RoleType;
import com.workops.app.exception.BadRequestException;
import com.workops.app.exception.ResourceNotFoundException;
import com.workops.app.repository.DepartmentRepository;
import com.workops.app.repository.EmployeeRepository;
import com.workops.app.repository.RoleRepository;
import com.workops.app.repository.UserRepository;
import com.workops.app.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAccountServiceImpl implements UserAccountService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public AccountSummaryDTO registerEmployee(SignupRequest request) {
        String username = request.getUsername().trim().toLowerCase(Locale.ROOT);
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("Username is already in use");
        }
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered");
        }

        Department department = departmentRepository.findByDeptCode(request.getDepartmentCode().trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentCode()));
        Role staffRole = roleRepository.findByName(RoleType.ROLE_STAFF)
                .orElseThrow(() -> new ResourceNotFoundException("Staff role is not configured"));

        String[] nameParts = request.getFullName().trim().split("\\s+", 2);
        String firstName = nameParts[0];
        String lastName = nameParts.length > 1 ? nameParts[1] : "";

        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(staffRole)
                .isActive(true)
                .build();
        User savedUser = userRepository.save(user);

        Employee employee = Employee.builder()
                .user(savedUser)
                .department(department)
                .employeeCode(generateEmployeeCode())
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .phone(request.getPhone())
                .designation(request.getDesignation().trim())
                .shiftStartTime(LocalTime.of(8, 30))
                .shiftEndTime(LocalTime.of(17, 30))
                .gracePeriodMinutes(15)
                .status(EmployeeStatus.ACTIVE)
                .build();

        Employee savedEmployee = employeeRepository.save(employee);
        return toSummary(savedUser, savedEmployee);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountSummaryDTO> getAccounts() {
        return userRepository.findAll().stream()
                .map(user -> employeeRepository.findByUserId(user.getId())
                        .map(employee -> toSummary(user, employee))
                        .orElseGet(() -> toSummary(user, null)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AccountSummaryDTO setActive(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        user.setIsActive(active);
        User savedUser = userRepository.save(user);
        Employee employee = employeeRepository.findByUserId(userId).orElse(null);
        if (employee != null) {
            employee.setStatus(active ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE);
            employeeRepository.save(employee);
        }
        return toSummary(savedUser, employee);
    }

    private String generateEmployeeCode() {
        return "EMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private AccountSummaryDTO toSummary(User user, Employee employee) {
        return AccountSummaryDTO.builder()
                .userId(user.getId())
                .employeeId(employee != null ? employee.getId() : null)
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(employee != null ? employee.getFullName().trim() : user.getUsername())
                .role(user.getRole().getName().name())
                .departmentName(employee != null && employee.getDepartment() != null ? employee.getDepartment().getName() : "N/A")
                .designation(employee != null ? employee.getDesignation() : "System User")
                .active(Boolean.TRUE.equals(user.getIsActive()))
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
