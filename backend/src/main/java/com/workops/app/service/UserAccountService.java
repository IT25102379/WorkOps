package com.workops.app.service;

import com.workops.app.dto.AccountSummaryDTO;
import com.workops.app.dto.SignupRequest;

import java.util.List;

public interface UserAccountService {
    AccountSummaryDTO registerEmployee(SignupRequest request);
    List<AccountSummaryDTO> getAccounts();
    AccountSummaryDTO setActive(Long userId, boolean active);
}
