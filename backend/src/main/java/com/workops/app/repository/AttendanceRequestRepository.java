package com.workops.app.repository;

import com.workops.app.entity.AttendanceRequest;
import com.workops.app.entity.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRequestRepository extends JpaRepository<AttendanceRequest, Long> {

    List<AttendanceRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<AttendanceRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status);

    List<AttendanceRequest> findAllByOrderByCreatedAtDesc();

    long countByStatus(RequestStatus status);
}
