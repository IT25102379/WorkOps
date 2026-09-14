package com.staffmanagement.service.impl;

import com.staffmanagement.entity.LeaveType;
import com.staffmanagement.exception.ResourceNotFoundException;
import com.staffmanagement.repository.LeaveTypeRepository;
import com.staffmanagement.service.LeaveTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveTypeServiceImpl implements LeaveTypeService {

    private final LeaveTypeRepository leaveTypeRepository;

    @Override
    public List<LeaveType> getAllActiveLeaveTypes() {
        return leaveTypeRepository.findByActiveTrue();
    }

    @Override
    public LeaveType getLeaveTypeById(Long id) {
        return leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave Type not found"));
    }
}
