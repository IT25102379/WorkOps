package com.workops.app.service;

import com.workops.app.dto.*;

import java.util.List;

public interface PayrollService {

    List<PayrollDTO> getPayrollRecords(Integer month, Integer year, Long departmentId, String search);

    List<PayrollOvertimeSummaryDTO> calculateOvertimeSummary(Integer month, Integer year);

    List<PayrollDTO> generateMonthlyPayroll(PayrollRunRequestDTO runRequest, String username);

    PayrollDTO getPayslip(Long id);

    PayrollDTO updatePaymentStatus(Long id, String status, String username);

    PayrollDTO adjustPayroll(Long id, PayrollAdjustmentDTO adjustmentDTO, String username);

    void deletePayroll(Long id, String username);

    List<PayrollDTO> getPayrollHistory();

    List<PayrollEventDTO> getPayrollEvents();

    PayrollEventDTO createPayrollEvent(PayrollEventDTO eventDTO, String username);

    void deletePayrollEvent(Long id, String username);
}
