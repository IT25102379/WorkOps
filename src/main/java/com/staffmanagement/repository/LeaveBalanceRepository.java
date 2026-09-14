package com.staffmanagement.repository;

import com.staffmanagement.entity.LeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Long> {
    List<LeaveBalance> findByEmployee_EmployeeIdAndYear(Long employeeId, Integer year);
    Optional<LeaveBalance> findByEmployee_EmployeeIdAndLeaveType_LeaveTypeIdAndYear(Long employeeId, Long leaveTypeId, Integer year);
}
