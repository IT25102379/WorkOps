package com.staffmanagement.config;

import com.staffmanagement.entity.Employee;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String uri = request.getRequestURI();
        
        // Allow access to login, static resources, and h2-console
        if (uri.startsWith("/login") || uri.startsWith("/css") || uri.startsWith("/js") || uri.startsWith("/images") || uri.startsWith("/h2-console")) {
            return true;
        }

        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("loggedInEmployee") == null) {
            response.sendRedirect("/login");
            return false;
        }

        Employee employee = (Employee) session.getAttribute("loggedInEmployee");
        
        // Role based access control for HR / Manager endpoints
        if (uri.startsWith("/leave/manage") && !("HR_OFFICER".equals(employee.getRole()) || "MANAGER".equals(employee.getRole()))) {
            // Employee trying to access HR dashboard
            response.sendRedirect("/leave/dashboard?error=access_denied");
            return false;
        }

        return true;
    }
}
