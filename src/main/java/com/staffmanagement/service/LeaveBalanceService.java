package com.staffmanagement.service;

import com.staffmanagement.entity.LeaveBalance;
import java.util.List;

public interface LeaveBalanceService {
    List<LeaveBalance> getLeaveBalancesForEmployee(Long employeeId, Integer year);
    LeaveBalance getLeaveBalance(Long employeeId, Long leaveTypeId, Integer year);
    void deductLeaveBalance(Long employeeId, Long leaveTypeId, Integer year, int daysToDeduct);
}
