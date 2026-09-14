package com.workops.app.repository;

import com.workops.app.entity.Employee;
import com.workops.app.entity.enums.EmployeeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByUserId(Long userId);
    Optional<Employee> findByEmployeeCode(String employeeCode);
    Optional<Employee> findByEmail(String email);
    List<Employee> findByDepartmentId(Long departmentId);
    List<Employee> findByStatus(EmployeeStatus status);
    long countByStatus(EmployeeStatus status);
}
