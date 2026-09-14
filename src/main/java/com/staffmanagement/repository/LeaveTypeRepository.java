package com.staffmanagement.repository;

import com.staffmanagement.entity.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveTypeRepository extends JpaRepository<LeaveType, Long> {
    List<LeaveType> findByActiveTrue();
    Optional<LeaveType> findByLeaveTypeName(String leaveTypeName);
}
