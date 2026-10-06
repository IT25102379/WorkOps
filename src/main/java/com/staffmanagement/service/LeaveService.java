package com.staffmanagement.service;

import com.staffmanagement.dto.LeaveRequestDTO;
import com.staffmanagement.entity.Employee;
import com.staffmanagement.entity.LeaveRequest;

import java.util.List;

public interface LeaveService {
    void applyLeave(LeaveRequestDTO leaveRequestDTO, Long employeeId);
    LeaveRequest getLeaveById(Long id);
    List<LeaveRequest> getEmployeeLeaveHistory(Long employeeId);
    void updateLeave(Long id, LeaveRequestDTO leaveRequestDTO);
    void cancelLeave(Long id);

    List<LeaveRequest> getAllRequests();
    List<LeaveRequest> getPendingRequests();

    // Returns only requests the given approver is allowed to act on
    List<LeaveRequest> getPendingRequestsForApprover(Employee approver);

    void approveLeave(Long id, Long approverId, String comment);
    void rejectLeave(Long id, Long reviewerId, String comment);
}
