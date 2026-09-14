package com.staffmanagement.controller;

import com.staffmanagement.service.LeaveService;
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

    // Hardcoded for testing.
    private final Long LOGGED_IN_MANAGER_ID = 2L;

    @GetMapping
    public String manageLeave(Model model) {
        model.addAttribute("pendingRequests", leaveService.getPendingRequests());
        model.addAttribute("allRequests", leaveService.getAllRequests()); // We could optimize this
        return "leave/manage-leave";
    }

    @PostMapping("/approve/{id}")
    public String approveLeave(@PathVariable Long id, 
                               @RequestParam(required = false) String comment, 
                               RedirectAttributes redirectAttributes) {
        try {
            leaveService.approveLeave(id, LOGGED_IN_MANAGER_ID, comment);
            redirectAttributes.addFlashAttribute("successMessage", "Leave request approved successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/leave/manage";
    }

    @PostMapping("/reject/{id}")
    public String rejectLeave(@PathVariable Long id, 
                              @RequestParam String comment, 
                              RedirectAttributes redirectAttributes) {
        try {
            leaveService.rejectLeave(id, LOGGED_IN_MANAGER_ID, comment);
            redirectAttributes.addFlashAttribute("successMessage", "Leave request rejected successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/leave/manage";
    }
}
