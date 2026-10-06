package com.staffmanagement.config;

import com.staffmanagement.entity.Employee;
import com.staffmanagement.entity.LeaveBalance;
import com.staffmanagement.entity.LeaveType;
import com.staffmanagement.repository.EmployeeRepository;
import com.staffmanagement.repository.LeaveBalanceRepository;
import com.staffmanagement.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (employeeRepository.count() == 0) {

            // ── Leave Types ──────────────────────────────────────────────
            LeaveType annual = new LeaveType();
            annual.setLeaveTypeName("Annual Leave");
            annual.setDefaultDays(14);
            annual.setDescription("Standard annual leave");
            annual.setActive(true);
            leaveTypeRepository.save(annual);

            LeaveType sick = new LeaveType();
            sick.setLeaveTypeName("Sick Leave");
            sick.setDefaultDays(7);
            sick.setDescription("Sick leave");
            sick.setActive(true);
            leaveTypeRepository.save(sick);

            LeaveType unpaid = new LeaveType();
            unpaid.setLeaveTypeName("Unpaid Leave");
            unpaid.setDefaultDays(0);
            unpaid.setDescription("Leave without pay");
            unpaid.setActive(true);
            leaveTypeRepository.save(unpaid);

            int year = LocalDate.now().getYear();

            // ── Employee 1 : John Doe (EMPLOYEE – IT) ────────────────────
            Employee emp1 = new Employee();
            emp1.setFirstName("John");
            emp1.setLastName("Doe");
            emp1.setEmail("john.employee@example.com");
            emp1.setDepartment("IT");
            emp1.setRole("EMPLOYEE");
            emp1.setStatus("ACTIVE");
            employeeRepository.save(emp1);
            createBalances(emp1, annual, sick, year);

            // ── Employee 2 : Sara Smith (EMPLOYEE – Finance) ─────────────
            Employee emp2 = new Employee();
            emp2.setFirstName("Sara");
            emp2.setLastName("Smith");
            emp2.setEmail("sara.employee@example.com");
            emp2.setDepartment("Finance");
            emp2.setRole("EMPLOYEE");
            emp2.setStatus("ACTIVE");
            employeeRepository.save(emp2);
            createBalances(emp2, annual, sick, year);

            // ── Manager : Jane Manager (MANAGER – IT) ────────────────────
            Employee mgr = new Employee();
            mgr.setFirstName("Jane");
            mgr.setLastName("Manager");
            mgr.setEmail("jane.manager@example.com");
            mgr.setDepartment("IT");
            mgr.setRole("MANAGER");
            mgr.setStatus("ACTIVE");
            employeeRepository.save(mgr);
            createBalances(mgr, annual, sick, year);

            // ── HR Officer : Alice HR (HR_OFFICER – HR) ──────────────────
            Employee hr = new Employee();
            hr.setFirstName("Alice");
            hr.setLastName("HR");
            hr.setEmail("alice.hr@example.com");
            hr.setDepartment("HR");
            hr.setRole("HR_OFFICER");
            hr.setStatus("ACTIVE");
            employeeRepository.save(hr);
            createBalances(hr, annual, sick, year);
        }
    }

    private void createBalances(Employee emp, LeaveType annual, LeaveType sick, int year) {
        LeaveBalance b1 = new LeaveBalance();
        b1.setEmployee(emp);
        b1.setLeaveType(annual);
        b1.setYear(year);
        b1.setAllocatedDays(annual.getDefaultDays());
        b1.setRemainingDays(annual.getDefaultDays());
        leaveBalanceRepository.save(b1);

        LeaveBalance b2 = new LeaveBalance();
        b2.setEmployee(emp);
        b2.setLeaveType(sick);
        b2.setYear(year);
        b2.setAllocatedDays(sick.getDefaultDays());
        b2.setRemainingDays(sick.getDefaultDays());
        leaveBalanceRepository.save(b2);
    }
}
