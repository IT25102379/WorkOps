package com.workops.app.service.impl;

import com.workops.app.dto.OvertimeRequestDTO;
import com.workops.app.dto.OvertimeStatusUpdateDTO;
import com.workops.app.entity.Employee;
import com.workops.app.entity.OvertimeRequest;
import com.workops.app.entity.User;
import com.workops.app.exception.ResourceNotFoundException;
import com.workops.app.repository.EmployeeRepository;
import com.workops.app.repository.OvertimeRequestRepository;
import com.workops.app.repository.UserRepository;
import com.workops.app.service.OvertimeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OvertimeServiceImpl implements OvertimeService {

    private final OvertimeRequestRepository overtimeRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public OvertimeRequestDTO createOvertime(OvertimeRequestDTO dto, String username) {
        log.info("Creating overtime request: username={}, employeeCode={}", username, dto.getEmployeeCode());

        Employee employee = resolveEmployee(dto.getEmployeeId(), dto.getEmployeeCode(), username);

        BigDecimal hours = calculateHours(dto.getStartTime(), dto.getEndTime(), dto.getOtHours());
        BigDecimal multiplier = (dto.getMultiplierRate() != null && dto.getMultiplierRate().compareTo(BigDecimal.ZERO) > 0)
                ? dto.getMultiplierRate()
                : new BigDecimal("1.50");

        String status = (dto.getStatus() != null && !dto.getStatus().isBlank())
                ? dto.getStatus().toUpperCase()
                : "PENDING";

        OvertimeRequest request = OvertimeRequest.builder()
                .employee(employee)
                .employeeCode(employee.getEmployeeCode())
                .employeeName(employee.getFirstName() + " " + employee.getLastName())
                .departmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : "General")
                .otDate(dto.getOtDate() != null ? dto.getOtDate() : LocalDate.now())
                .startTime(dto.getStartTime() != null ? dto.getStartTime() : LocalTime.of(17, 30))
                .endTime(dto.getEndTime() != null ? dto.getEndTime() : LocalTime.of(20, 30))
                .otHours(hours)
                .multiplierRate(multiplier)
                .taskDescription(dto.getTaskDescription())
                .reason(dto.getReason())
                .status(status)
                .createdBy(username != null ? username : "HR Manager")
                .approvedBy("APPROVED".equalsIgnoreCase(status) ? (username != null ? username : "HR Manager") : null)
                .approvedAt("APPROVED".equalsIgnoreCase(status) ? LocalDateTime.now() : null)
                .build();

        OvertimeRequest saved = overtimeRequestRepository.save(request);
        log.info("Overtime request saved with ID: {}", saved.getId());
        return mapToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OvertimeRequestDTO> getAllOvertime(LocalDate startDate, LocalDate endDate, String status, String search) {
        return overtimeRequestRepository.filterOvertime(startDate, endDate, status, search)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OvertimeRequestDTO> getMyOvertime(String username) {
        if (username == null || username.isBlank() || "anonymousUser".equalsIgnoreCase(username)) {
            return overtimeRequestRepository.findAllByOrderByCreatedAtDesc()
                    .stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
        }
        return overtimeRequestRepository.findByUsername(username)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OvertimeRequestDTO getOvertimeById(Long id) {
        OvertimeRequest req = overtimeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found with ID: " + id));
        return mapToDTO(req);
    }

    @Override
    @Transactional
    public OvertimeRequestDTO updateOvertime(Long id, OvertimeRequestDTO dto, String username) {
        OvertimeRequest request = overtimeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found with ID: " + id));

        if (dto.getEmployeeId() != null || dto.getEmployeeCode() != null) {
            Employee emp = resolveEmployee(dto.getEmployeeId(), dto.getEmployeeCode(), null);
            request.setEmployee(emp);
            request.setEmployeeCode(emp.getEmployeeCode());
            request.setEmployeeName(emp.getFirstName() + " " + emp.getLastName());
            if (emp.getDepartment() != null) {
                request.setDepartmentName(emp.getDepartment().getName());
            }
        }

        if (dto.getOtDate() != null) request.setOtDate(dto.getOtDate());
        if (dto.getStartTime() != null) request.setStartTime(dto.getStartTime());
        if (dto.getEndTime() != null) request.setEndTime(dto.getEndTime());
        
        request.setOtHours(calculateHours(request.getStartTime(), request.getEndTime(), dto.getOtHours()));
        
        if (dto.getMultiplierRate() != null) request.setMultiplierRate(dto.getMultiplierRate());
        if (dto.getTaskDescription() != null) request.setTaskDescription(dto.getTaskDescription());
        if (dto.getReason() != null) request.setReason(dto.getReason());

        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            String newStatus = dto.getStatus().toUpperCase();
            request.setStatus(newStatus);
            if ("APPROVED".equalsIgnoreCase(newStatus) && request.getApprovedAt() == null) {
                request.setApprovedBy(username != null ? username : "HR Manager");
                request.setApprovedAt(LocalDateTime.now());
            }
        }

        OvertimeRequest updated = overtimeRequestRepository.save(request);
        log.info("Overtime record #{} updated by {}", updated.getId(), username);
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public OvertimeRequestDTO updateOvertimeStatus(Long id, OvertimeStatusUpdateDTO statusDTO, String username) {
        OvertimeRequest request = overtimeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found with ID: " + id));

        String newStatus = (statusDTO.getStatus() != null) ? statusDTO.getStatus().toUpperCase() : "APPROVED";
        request.setStatus(newStatus);

        if ("APPROVED".equalsIgnoreCase(newStatus)) {
            request.setApprovedBy(username != null ? username : (statusDTO.getApprovedBy() != null ? statusDTO.getApprovedBy() : "HR Manager"));
            request.setApprovedAt(LocalDateTime.now());
        } else if ("REJECTED".equalsIgnoreCase(newStatus)) {
            request.setApprovedBy(username != null ? username : "HR Manager");
            request.setApprovedAt(LocalDateTime.now());
        }

        if (statusDTO.getReviewComment() != null && !statusDTO.getReviewComment().isBlank()) {
            String existingReason = request.getReason() != null ? request.getReason() : "";
            request.setReason(existingReason + " [Review Note: " + statusDTO.getReviewComment() + "]");
        }

        OvertimeRequest updated = overtimeRequestRepository.save(request);
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public void deleteOvertime(Long id, String username) {
        OvertimeRequest request = overtimeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found with ID: " + id));
        overtimeRequestRepository.delete(request);
        log.info("Overtime record #{} deleted by {}", id, username);
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.workops.app.dto.EmployeeSummaryDTO> getActiveEmployees() {
        return employeeRepository.findAll().stream()
                .map(emp -> com.workops.app.dto.EmployeeSummaryDTO.builder()
                        .id(emp.getId())
                        .employeeCode(emp.getEmployeeCode())
                        .firstName(emp.getFirstName())
                        .lastName(emp.getLastName())
                        .fullName(emp.getFullName())
                        .departmentName(emp.getDepartment() != null ? emp.getDepartment().getName() : "General")
                        .designation(emp.getDesignation())
                        .email(emp.getEmail())
                        .build())
                .collect(Collectors.toList());
    }

    private Employee resolveEmployee(Long employeeId, String employeeCode, String username) {
        if (employeeId != null) {
            return employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + employeeId));
        }
        if (employeeCode != null && !employeeCode.isBlank()) {
            return employeeRepository.findByEmployeeCode(employeeCode)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with code: " + employeeCode));
        }
        if (username != null && !username.isBlank() && !"anonymousUser".equalsIgnoreCase(username)) {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                return employeeRepository.findByUserId(user.getId())
                        .orElseGet(() -> employeeRepository.findAll().stream().findFirst()
                                .orElseThrow(() -> new ResourceNotFoundException("No employee profile found")));
            }
        }
        return employeeRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No employee profile available in system"));
    }

    private BigDecimal calculateHours(LocalTime start, LocalTime end, BigDecimal explicitHours) {
        if (explicitHours != null && explicitHours.compareTo(BigDecimal.ZERO) > 0) {
            return explicitHours;
        }
        if (start != null && end != null) {
            long minutes;
            if (end.isAfter(start)) {
                minutes = Duration.between(start, end).toMinutes();
            } else {
                minutes = Duration.between(start, LocalTime.MAX).toMinutes() + Duration.between(LocalTime.MIN, end).toMinutes() + 1;
            }
            return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }
        return new BigDecimal("2.00");
    }

    private OvertimeRequestDTO mapToDTO(OvertimeRequest req) {
        return OvertimeRequestDTO.builder()
                .id(req.getId())
                .employeeId(req.getEmployee() != null ? req.getEmployee().getId() : null)
                .employeeCode(req.getEmployeeCode())
                .employeeName(req.getEmployeeName())
                .departmentName(req.getDepartmentName())
                .otDate(req.getOtDate())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .otHours(req.getOtHours())
                .multiplierRate(req.getMultiplierRate())
                .taskDescription(req.getTaskDescription())
                .reason(req.getReason())
                .status(req.getStatus())
                .createdBy(req.getCreatedBy())
                .approvedBy(req.getApprovedBy())
                .approvedAt(req.getApprovedAt())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .build();
    }
}
