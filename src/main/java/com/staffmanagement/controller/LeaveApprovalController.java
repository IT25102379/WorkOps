package com.staffmanagement.controller;

import com.staffmanagement.entity.Employee;
import com.staffmanagement.service.LeaveService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/leave/manage")
@RequiredArgsConstructor
public class LeaveApprovalController {

    private final LeaveService leaveService;

    private Employee getLoggedInApprover(HttpSession session) {
        Employee employee = (Employee) session.getAttribute("loggedInEmployee");
        if (employee == null) throw new IllegalStateException("User not logged in");
        return employee;
    }

    @GetMapping
    public String manageLeave(Model model, HttpSession session) {
        Employee approver = getLoggedInApprover(session);
        // Show only the requests this approver is allowed to see/act on
        model.addAttribute("pendingRequests", leaveService.getPendingRequestsForApprover(approver));
        model.addAttribute("allRequests", leaveService.getAllRequests());
        model.addAttribute("approverRole", approver.getRole());
        return "leave/manage-leave";
    }

    @PostMapping("/approve/{id}")
    public String approveLeave(@PathVariable Long id,
                               @RequestParam(required = false) String comment,
                               HttpSession session,
                               RedirectAttributes redirectAttributes) {
        try {
            Employee approver = getLoggedInApprover(session);
            leaveService.approveLeave(id, approver.getEmployeeId(), comment);
            redirectAttributes.addFlashAttribute("successMessage", "Leave request approved successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/leave/manage";
    }

    @PostMapping("/reject/{id}")
    public String rejectLeave(@PathVariable Long id,
                              @RequestParam(required = false) String comment,
                              HttpSession session,
                              RedirectAttributes redirectAttributes) {
        try {
            Employee approver = getLoggedInApprover(session);
            leaveService.rejectLeave(id, approver.getEmployeeId(), comment);
            redirectAttributes.addFlashAttribute("successMessage", "Leave request rejected successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/leave/manage";
    }
}
