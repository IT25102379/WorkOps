package com.staffmanagement.service;

import com.staffmanagement.dto.LeaveRequestDTO;
import com.staffmanagement.entity.LeaveRequest;
import com.staffmanagement.entity.LeaveStatus;

import java.util.List;

public interface LeaveService {
    void applyLeave(LeaveRequestDTO leaveRequestDTO, Long employeeId);
    LeaveRequest getLeaveById(Long id);
    List<LeaveRequest> getEmployeeLeaveHistory(Long employeeId);
    void updateLeave(Long id, LeaveRequestDTO leaveRequestDTO);
    void cancelLeave(Long id);
    
    List<LeaveRequest> getAllRequests();
    List<LeaveRequest> getPendingRequests();
    
    void approveLeave(Long id, Long approverId, String comment);
    void rejectLeave(Long id, Long reviewerId, String comment);
}
