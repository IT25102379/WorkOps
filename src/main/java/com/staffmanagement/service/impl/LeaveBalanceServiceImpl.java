package com.staffmanagement.service.impl;

import com.staffmanagement.entity.LeaveBalance;
import com.staffmanagement.exception.InsufficientLeaveBalanceException;
import com.staffmanagement.exception.ResourceNotFoundException;
import com.staffmanagement.repository.LeaveBalanceRepository;
import com.staffmanagement.service.LeaveBalanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveBalanceServiceImpl implements LeaveBalanceService {

    private final LeaveBalanceRepository leaveBalanceRepository;

    @Override
    public List<LeaveBalance> getLeaveBalancesForEmployee(Long employeeId, Integer year) {
        return leaveBalanceRepository.findByEmployee_EmployeeIdAndYear(employeeId, year);
    }

    @Override
    public LeaveBalance getLeaveBalance(Long employeeId, Long leaveTypeId, Integer year) {
        return leaveBalanceRepository.findByEmployee_EmployeeIdAndLeaveType_LeaveTypeIdAndYear(employeeId, leaveTypeId, year)
                .orElseThrow(() -> new ResourceNotFoundException("Leave Balance not found for the given criteria"));
    }

    @Override
    @Transactional
    public void deductLeaveBalance(Long employeeId, Long leaveTypeId, Integer year, int daysToDeduct) {
        LeaveBalance balance = getLeaveBalance(employeeId, leaveTypeId, year);
        
        if (balance.getRemainingDays() < daysToDeduct && !balance.getLeaveType().getLeaveTypeName().equalsIgnoreCase("Unpaid Leave")) {
            throw new InsufficientLeaveBalanceException("Insufficient leave balance for this leave type");
        }
        
        balance.setUsedDays(balance.getUsedDays() + daysToDeduct);
        balance.setRemainingDays(balance.getAllocatedDays() - balance.getUsedDays());
        leaveBalanceRepository.save(balance);
    }
}
