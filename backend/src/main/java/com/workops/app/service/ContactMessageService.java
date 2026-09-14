package com.workops.app.service;

import com.workops.app.dto.ContactMessageRequest;

public interface ContactMessageService {

    void saveMessage(ContactMessageRequest request);
}
