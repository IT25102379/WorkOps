package com.staffmanagement.service.impl;

import com.staffmanagement.dto.LeaveRequestDTO;
import com.staffmanagement.entity.Employee;
import com.staffmanagement.entity.LeaveBalance;
import com.staffmanagement.entity.LeaveRequest;
import com.staffmanagement.entity.LeaveStatus;
import com.staffmanagement.entity.LeaveType;
import com.staffmanagement.exception.InsufficientLeaveBalanceException;
import com.staffmanagement.exception.ResourceNotFoundException;
import com.staffmanagement.repository.EmployeeRepository;
import com.staffmanagement.repository.LeaveRequestRepository;
import com.staffmanagement.service.LeaveBalanceService;
import com.staffmanagement.service.LeaveService;
import com.staffmanagement.service.LeaveTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveServiceImpl implements LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeService leaveTypeService;
    private final LeaveBalanceService leaveBalanceService;

    @Override
    @Transactional
    public void applyLeave(LeaveRequestDTO dto, Long employeeId) {
        validateDates(dto.getStartDate(), dto.getEndDate());

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        LeaveType leaveType = leaveTypeService.getLeaveTypeById(dto.getLeaveTypeId());
        
        List<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaveRequests(
                employeeId, dto.getStartDate(), dto.getEndDate());
        if (!overlapping.isEmpty()) {
            throw new IllegalArgumentException("An overlapping leave request already exists.");
        }

        int days = calculateDays(dto.getStartDate(), dto.getEndDate());
        dto.setNumberOfDays(days);

        // Check Balance early
        if (!leaveType.getLeaveTypeName().equalsIgnoreCase("Unpaid Leave")) {
            LeaveBalance balance = leaveBalanceService.getLeaveBalance(employeeId, leaveType.getLeaveTypeId(), dto.getStartDate().getYear());
            if (balance.getRemainingDays() < days) {
                throw new InsufficientLeaveBalanceException("Insufficient leave balance.");
            }
        }

        LeaveRequest request = new LeaveRequest();
        request.setEmployee(employee);
        request.setLeaveType(leaveType);
        request.setStartDate(dto.getStartDate());
        request.setEndDate(dto.getEndDate());
        request.setNumberOfDays(days);
        request.setReason(dto.getReason());
        request.setStatus(LeaveStatus.PENDING);

        leaveRequestRepository.save(request);
    }

    @Override
    public LeaveRequest getLeaveById(Long id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
    }

    @Override
    public List<LeaveRequest> getEmployeeLeaveHistory(Long employeeId) {
        return leaveRequestRepository.findByEmployee_EmployeeIdOrderByAppliedDateDesc(employeeId);
    }

    @Override
    @Transactional
    public void updateLeave(Long id, LeaveRequestDTO dto) {
        LeaveRequest request = getLeaveById(id);
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new IllegalStateException("Only PENDING leave requests can be edited");
        }
        
        validateDates(dto.getStartDate(), dto.getEndDate());

        List<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaveRequests(
                request.getEmployee().getEmployeeId(), dto.getStartDate(), dto.getEndDate());
        
        boolean hasOverlap = overlapping.stream().anyMatch(lr -> !lr.getLeaveRequestId().equals(id));
        if (hasOverlap) {
            throw new IllegalArgumentException("An overlapping leave request already exists.");
        }

        int days = calculateDays(dto.getStartDate(), dto.getEndDate());
        
        LeaveType leaveType = leaveTypeService.getLeaveTypeById(dto.getLeaveTypeId());
        
        if (!leaveType.getLeaveTypeName().equalsIgnoreCase("Unpaid Leave")) {
            LeaveBalance balance = leaveBalanceService.getLeaveBalance(
                    request.getEmployee().getEmployeeId(), leaveType.getLeaveTypeId(), dto.getStartDate().getYear());
            if (balance.getRemainingDays() < days) {
                throw new InsufficientLeaveBalanceException("Insufficient leave balance.");
            }
        }

        request.setLeaveType(leaveType);
        request.setStartDate(dto.getStartDate());
        request.setEndDate(dto.getEndDate());
        request.setNumberOfDays(days);
        request.setReason(dto.getReason());

        leaveRequestRepository.save(request);
    }

    @Override
    @Transactional
    public void cancelLeave(Long id) {
        LeaveRequest request = getLeaveById(id);
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new IllegalStateException("Only PENDING leave requests can be cancelled");
        }
        request.setStatus(LeaveStatus.CANCELLED);
        leaveRequestRepository.save(request);
    }

    @Override
    public List<LeaveRequest> getAllRequests() {
        return leaveRequestRepository.findAll();
    }

    @Override
    public List<LeaveRequest> getPendingRequests() {
        return leaveRequestRepository.findByStatus(LeaveStatus.PENDING);
    }

    @Override
    @Transactional
    public void approveLeave(Long id, Long approverId, String comment) {
        LeaveRequest request = getLeaveById(id);
        if (request.getEmployee().getEmployeeId().equals(approverId)) {
            throw new IllegalStateException("You cannot approve your own leave request.");
        }
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new IllegalStateException("Leave request is already processed");
        }

        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Approver not found"));

        // Deduct balance
        leaveBalanceService.deductLeaveBalance(
                request.getEmployee().getEmployeeId(), 
                request.getLeaveType().getLeaveTypeId(), 
                request.getStartDate().getYear(), 
                request.getNumberOfDays());

        request.setStatus(LeaveStatus.APPROVED);
        request.setApprovedBy(approver);
        request.setApprovedDate(LocalDateTime.now());
        request.setManagerComment(comment);

        leaveRequestRepository.save(request);
    }

    @Override
    @Transactional
    public void rejectLeave(Long id, Long reviewerId, String comment) {
        LeaveRequest request = getLeaveById(id);
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new IllegalStateException("Leave request is already processed");
        }
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection reason is required.");
        }

        Employee reviewer = employeeRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found"));

        request.setStatus(LeaveStatus.REJECTED);
        request.setApprovedBy(reviewer); // Using this field to track who rejected
        request.setApprovedDate(LocalDateTime.now());
        request.setManagerComment(comment);

        leaveRequestRepository.save(request);
    }

    private void validateDates(LocalDate start, LocalDate end) {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date cannot be before start date.");
        }
    }

    private int calculateDays(LocalDate start, LocalDate end) {
        return (int) ChronoUnit.DAYS.between(start, end) + 1;
    }
}
