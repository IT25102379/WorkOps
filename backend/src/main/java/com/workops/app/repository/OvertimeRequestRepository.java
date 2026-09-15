package com.workops.app.repository;

import com.workops.app.entity.OvertimeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface OvertimeRequestRepository extends JpaRepository<OvertimeRequest, Long> {

    List<OvertimeRequest> findAllByOrderByCreatedAtDesc();

    List<OvertimeRequest> findByEmployeeIdOrderByOtDateDesc(Long employeeId);

    @Query("SELECT o FROM OvertimeRequest o WHERE o.employee.user.username = :username ORDER BY o.otDate DESC")
    List<OvertimeRequest> findByUsername(@Param("username") String username);

    @Query("SELECT o FROM OvertimeRequest o WHERE " +
           "(:startDate IS NULL OR o.otDate >= :startDate) AND " +
           "(:endDate IS NULL OR o.otDate <= :endDate) AND " +
           "(:status IS NULL OR o.status = :status) AND " +
           "(:search IS NULL OR LOWER(o.employeeName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(o.employeeCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(o.taskDescription) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY o.otDate DESC, o.createdAt DESC")
    List<OvertimeRequest> filterOvertime(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") String status,
            @Param("search") String search
    );
}
