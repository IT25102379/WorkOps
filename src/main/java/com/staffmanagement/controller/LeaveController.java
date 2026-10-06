package com.staffmanagement.controller;

import com.staffmanagement.dto.LeaveRequestDTO;
import com.staffmanagement.entity.Employee;
import com.staffmanagement.entity.LeaveBalance;
import com.staffmanagement.entity.LeaveRequest;
import com.staffmanagement.service.LeaveBalanceService;
import com.staffmanagement.service.LeaveService;
import com.staffmanagement.service.LeaveTypeService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.List;

@Controller
@RequestMapping("/leave")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;
    private final LeaveTypeService leaveTypeService;
    private final LeaveBalanceService leaveBalanceService;

    private Long getLoggedInEmployeeId(HttpSession session) {
        Employee employee = (Employee) session.getAttribute("loggedInEmployee");
        if (employee != null) {
            return employee.getEmployeeId();
        }
        throw new IllegalStateException("User not logged in");
    }

    @GetMapping("/dashboard")
    public String leaveDashboard(Model model, HttpSession session) {
        Long empId = getLoggedInEmployeeId(session);
        int currentYear = LocalDate.now().getYear();
        List<LeaveBalance> balances = leaveBalanceService.getLeaveBalancesForEmployee(empId, currentYear);
        List<LeaveRequest> history = leaveService.getEmployeeLeaveHistory(empId);
        
        model.addAttribute("balances", balances);
        model.addAttribute("history", history);
        
        return "leave/leave-dashboard";
    }

    @GetMapping("/apply")
    public String showApplyLeaveForm(Model model) {
        if (!model.containsAttribute("leaveRequestDTO")) {
            model.addAttribute("leaveRequestDTO", new LeaveRequestDTO());
        }
        model.addAttribute("leaveTypes", leaveTypeService.getAllActiveLeaveTypes());
        return "leave/apply-leave";
    }

    @PostMapping("/apply")
    public String applyLeave(@Valid @ModelAttribute("leaveRequestDTO") LeaveRequestDTO dto, 
                             BindingResult bindingResult, 
                             HttpSession session,
                             RedirectAttributes redirectAttributes) {
        
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.leaveRequestDTO", bindingResult);
            redirectAttributes.addFlashAttribute("leaveRequestDTO", dto);
            return "redirect:/leave/apply";
        }

        try {
            Long empId = getLoggedInEmployeeId(session);
            leaveService.applyLeave(dto, empId);
            redirectAttributes.addFlashAttribute("successMessage", "Leave request submitted successfully.");
            return "redirect:/leave/dashboard";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            redirectAttributes.addFlashAttribute("leaveRequestDTO", dto);
            return "redirect:/leave/apply";
        }
    }

    @GetMapping("/history")
    public String leaveHistory(Model model, HttpSession session) {
        Long empId = getLoggedInEmployeeId(session);
        List<LeaveRequest> history = leaveService.getEmployeeLeaveHistory(empId);
        model.addAttribute("history", history);
        return "leave/leave-history";
    }

    @GetMapping("/edit/{id}")
    public String showEditLeaveForm(@PathVariable Long id, Model model, HttpSession session, RedirectAttributes redirectAttributes) {
        try {
            Long empId = getLoggedInEmployeeId(session);
            LeaveRequest request = leaveService.getLeaveById(id);
            if (!request.getEmployee().getEmployeeId().equals(empId)) {
                redirectAttributes.addFlashAttribute("errorMessage", "Access Denied");
                return "redirect:/leave/dashboard";
            }
            
            LeaveRequestDTO dto = new LeaveRequestDTO();
            dto.setLeaveRequestId(request.getLeaveRequestId());
            dto.setLeaveTypeId(request.getLeaveType().getLeaveTypeId());
            dto.setStartDate(request.getStartDate());
            dto.setEndDate(request.getEndDate());
            dto.setReason(request.getReason());
            
            model.addAttribute("leaveRequestDTO", dto);
            model.addAttribute("leaveTypes", leaveTypeService.getAllActiveLeaveTypes());
            
            return "leave/edit-leave";
            
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/leave/dashboard";
        }
    }

    @PostMapping("/update/{id}")
    public String updateLeave(@PathVariable Long id,
                              @Valid @ModelAttribute("leaveRequestDTO") LeaveRequestDTO dto,
                              BindingResult bindingResult,
                              RedirectAttributes redirectAttributes) {
        
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.leaveRequestDTO", bindingResult);
            redirectAttributes.addFlashAttribute("leaveRequestDTO", dto);
            return "redirect:/leave/edit/" + id;
        }

        try {
            leaveService.updateLeave(id, dto);
            redirectAttributes.addFlashAttribute("successMessage", "Leave request updated successfully.");
            return "redirect:/leave/dashboard";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/leave/edit/" + id;
        }
    }

    @PostMapping("/cancel/{id}")
    public String cancelLeave(@PathVariable Long id, HttpSession session, RedirectAttributes redirectAttributes) {
        try {
            Long empId = getLoggedInEmployeeId(session);
            LeaveRequest request = leaveService.getLeaveById(id);
            if (!request.getEmployee().getEmployeeId().equals(empId)) {
                throw new IllegalStateException("Access Denied");
            }
            leaveService.cancelLeave(id);
            redirectAttributes.addFlashAttribute("successMessage", "Leave request cancelled successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/leave/dashboard";
    }
}
