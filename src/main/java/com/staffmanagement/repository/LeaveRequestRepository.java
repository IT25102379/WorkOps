package com.staffmanagement.repository;

import com.staffmanagement.entity.LeaveRequest;
import com.staffmanagement.entity.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByEmployee_EmployeeIdOrderByAppliedDateDesc(Long employeeId);
    List<LeaveRequest> findByStatus(LeaveStatus status);
    List<LeaveRequest> findByEmployee_EmployeeIdAndStatus(Long employeeId, LeaveStatus status);
    
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.employeeId = :employeeId " +
           "AND lr.status NOT IN ('REJECTED', 'CANCELLED') " +
           "AND ((lr.startDate <= :endDate AND lr.endDate >= :startDate))")
    List<LeaveRequest> findOverlappingLeaveRequests(
            @Param("employeeId") Long employeeId, 
            @Param("startDate") LocalDate startDate, 
            @Param("endDate") LocalDate endDate);
}
