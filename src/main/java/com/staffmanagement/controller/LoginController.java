package com.staffmanagement.controller;

import com.staffmanagement.entity.Employee;
import com.staffmanagement.repository.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class LoginController {

    private final EmployeeRepository employeeRepository;

    @GetMapping("/login")
    public String showLoginForm(HttpSession session) {
        if (session != null && session.getAttribute("loggedInEmployee") != null) {
            Employee emp = (Employee) session.getAttribute("loggedInEmployee");
            if ("HR_OFFICER".equals(emp.getRole()) || "MANAGER".equals(emp.getRole())) {
                return "redirect:/leave/manage";
            }
            return "redirect:/leave/dashboard";
        }
        return "login";
    }

    @PostMapping("/login")
    public String processLogin(@RequestParam String email, 
                               HttpServletRequest request, 
                               RedirectAttributes redirectAttributes) {
        Optional<Employee> employeeOpt = employeeRepository.findByEmail(email);
        
        if (employeeOpt.isPresent()) {
            Employee employee = employeeOpt.get();
            HttpSession session = request.getSession();
            session.setAttribute("loggedInEmployee", employee);
            
            if ("HR_OFFICER".equals(employee.getRole()) || "MANAGER".equals(employee.getRole())) {
                return "redirect:/leave/manage";
            }
            return "redirect:/leave/dashboard";
        }
        
        redirectAttributes.addFlashAttribute("errorMessage", "Invalid email address.");
        return "redirect:/login";
    }

    @GetMapping("/logout")
    public String logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return "redirect:/login";
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/login";
    }
}
