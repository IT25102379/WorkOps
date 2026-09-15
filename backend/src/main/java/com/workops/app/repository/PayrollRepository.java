package com.workops.app.repository;

import com.workops.app.entity.Payroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, Long> {

    List<Payroll> findByPayrollMonthAndPayrollYear(Integer payrollMonth, Integer payrollYear);

    List<Payroll> findByEmployeeId(Long employeeId);

    Optional<Payroll> findByEmployeeIdAndPayrollMonthAndPayrollYear(Long employeeId, Integer payrollMonth, Integer payrollYear);

    List<Payroll> findAllByOrderByPayrollYearDescPayrollMonthDesc();

    @Query("SELECT p FROM Payroll p WHERE " +
           "(:month IS NULL OR p.payrollMonth = :month) AND " +
           "(:year IS NULL OR p.payrollYear = :year) AND " +
           "(:deptId IS NULL OR p.employee.department.id = :deptId) AND " +
           "(:search IS NULL OR LOWER(p.employee.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.employee.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.employee.employeeCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY p.employee.department.name ASC, p.employee.firstName ASC")
    List<Payroll> filterPayroll(
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("deptId") Long deptId,
            @Param("search") String search
    );
}
