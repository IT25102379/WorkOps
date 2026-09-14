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
import java.util.Arrays;

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
            // Create Employees
            Employee emp1 = new Employee();
            emp1.setFirstName("John");
            emp1.setLastName("Doe");
            emp1.setEmail("john.employee@example.com");
            emp1.setDepartment("IT");
            emp1.setRole("EMPLOYEE");
            emp1.setStatus("ACTIVE");
            employeeRepository.save(emp1);

            Employee mgr1 = new Employee();
            mgr1.setFirstName("Jane");
            mgr1.setLastName("Manager");
            mgr1.setEmail("jane.manager@example.com");
            mgr1.setDepartment("IT");
            mgr1.setRole("MANAGER");
            mgr1.setStatus("ACTIVE");
            employeeRepository.save(mgr1);

            Employee hr1 = new Employee();
            hr1.setFirstName("Alice");
            hr1.setLastName("HR");
            hr1.setEmail("alice.hr@example.com");
            hr1.setDepartment("HR");
            hr1.setRole("HR_OFFICER");
            hr1.setStatus("ACTIVE");
            employeeRepository.save(hr1);

            // Create Leave Types
            LeaveType annual = new LeaveType();
            annual.setLeaveTypeName("Annual Leave");
            annual.setDefaultDays(14);
            annual.setDescription("Standard annual leave");
            leaveTypeRepository.save(annual);

            LeaveType sick = new LeaveType();
            sick.setLeaveTypeName("Sick Leave");
            sick.setDefaultDays(7);
            sick.setDescription("Sick leave");
            leaveTypeRepository.save(sick);
            
            LeaveType unpaid = new LeaveType();
            unpaid.setLeaveTypeName("Unpaid Leave");
            unpaid.setDefaultDays(0);
            unpaid.setDescription("Leave without pay");
            leaveTypeRepository.save(unpaid);

            // Create Balances for emp1
            int year = LocalDate.now().getYear();
            
            LeaveBalance bal1 = new LeaveBalance();
            bal1.setEmployee(emp1);
            bal1.setLeaveType(annual);
            bal1.setYear(year);
            bal1.setAllocatedDays(annual.getDefaultDays());
            bal1.setRemainingDays(annual.getDefaultDays());
            leaveBalanceRepository.save(bal1);

            LeaveBalance bal2 = new LeaveBalance();
            bal2.setEmployee(emp1);
            bal2.setLeaveType(sick);
            bal2.setYear(year);
            bal2.setAllocatedDays(sick.getDefaultDays());
            bal2.setRemainingDays(sick.getDefaultDays());
            leaveBalanceRepository.save(bal2);
        }
    }
}
