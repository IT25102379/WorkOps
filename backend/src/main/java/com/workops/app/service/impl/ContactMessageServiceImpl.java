package com.workops.app.service.impl;

import com.workops.app.dto.ContactMessageRequest;
import com.workops.app.entity.ContactMessage;
import com.workops.app.repository.ContactMessageRepository;
import com.workops.app.service.ContactMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContactMessageServiceImpl implements ContactMessageService {

    private final ContactMessageRepository contactMessageRepository;

    @Override
    @Transactional
    public void saveMessage(ContactMessageRequest request) {
        ContactMessage contactMessage = ContactMessage.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .subject(request.getSubject() == null || request.getSubject().isBlank() ? null : request.getSubject().trim())
                .message(request.getMessage().trim())
                .status("NEW")
                .build();

        contactMessageRepository.save(contactMessage);
    }
}
