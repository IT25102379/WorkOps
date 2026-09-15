package com.workops.app.service;

import com.workops.app.dto.OvertimeRequestDTO;
import com.workops.app.dto.OvertimeStatusUpdateDTO;

import java.time.LocalDate;
import java.util.List;

public interface OvertimeService {

    OvertimeRequestDTO createOvertime(OvertimeRequestDTO dto, String username);

    List<OvertimeRequestDTO> getAllOvertime(LocalDate startDate, LocalDate endDate, String status, String search);

    List<OvertimeRequestDTO> getMyOvertime(String username);

    OvertimeRequestDTO getOvertimeById(Long id);

    OvertimeRequestDTO updateOvertime(Long id, OvertimeRequestDTO dto, String username);

    OvertimeRequestDTO updateOvertimeStatus(Long id, OvertimeStatusUpdateDTO statusDTO, String username);

    void deleteOvertime(Long id, String username);

    List<com.workops.app.dto.EmployeeSummaryDTO> getActiveEmployees();
}
