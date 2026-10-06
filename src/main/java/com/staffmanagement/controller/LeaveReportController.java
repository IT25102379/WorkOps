package com.staffmanagement.controller;

import com.staffmanagement.service.LeaveService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/leave/report")
@RequiredArgsConstructor
public class LeaveReportController {

    private final LeaveService leaveService;

    @GetMapping
    public String leaveReport(Model model) {
        model.addAttribute("allRequests", leaveService.getAllRequests());
        return "leave/leave-report";
    }
}
