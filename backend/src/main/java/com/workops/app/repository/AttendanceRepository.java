package com.workops.app.repository;

import com.workops.app.entity.Attendance;
import com.workops.app.entity.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);

    List<Attendance> findByEmployeeIdOrderByAttendanceDateDesc(Long employeeId);

    List<Attendance> findByAttendanceDate(LocalDate attendanceDate);

    long countByAttendanceDate(LocalDate attendanceDate);

    long countByAttendanceDateAndStatus(LocalDate attendanceDate, AttendanceStatus status);

    @Query("SELECT COALESCE(SUM(a.overtimeMinutes), 0) FROM Attendance a WHERE a.attendanceDate = :date")
    Long sumOvertimeMinutesByDate(@Param("date") LocalDate date);

    @Query("SELECT a FROM Attendance a WHERE " +
           "(:startDate IS NULL OR a.attendanceDate >= :startDate) AND " +
           "(:endDate IS NULL OR a.attendanceDate <= :endDate) AND " +
           "(:deptId IS NULL OR a.employee.department.id = :deptId) AND " +
           "(:empId IS NULL OR a.employee.id = :empId) AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:search IS NULL OR LOWER(a.employee.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(a.employee.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(a.employee.employeeCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY a.attendanceDate DESC, a.clockInTime DESC")
    List<Attendance> filterAttendance(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("deptId") Long deptId,
            @Param("empId") Long empId,
            @Param("status") AttendanceStatus status,
            @Param("search") String search
    );
}
