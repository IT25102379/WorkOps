package com.staffmanagement.service;

import com.staffmanagement.entity.LeaveType;
import java.util.List;

public interface LeaveTypeService {
    List<LeaveType> getAllActiveLeaveTypes();
    LeaveType getLeaveTypeById(Long id);
}
