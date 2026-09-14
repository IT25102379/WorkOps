package com.workops.app.controller;

import com.workops.app.dto.ApiResponse;
import com.workops.app.dto.ContactMessageRequest;
import com.workops.app.service.ContactMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/contact")
@RequiredArgsConstructor
@Tag(name = "Contact", description = "Public contact form submission endpoints")
public class ContactMessageController {

    private final ContactMessageService contactMessageService;

    @PostMapping("/messages")
    @Operation(summary = "Save a public Contact Us message")
    public ResponseEntity<ApiResponse<Void>> submitMessage(@Valid @RequestBody ContactMessageRequest request) {
        contactMessageService.saveMessage(request);
        return ResponseEntity.ok(ApiResponse.ok("Your message was submitted successfully", null));
    }
}
