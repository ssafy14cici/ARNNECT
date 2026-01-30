package com.ssafy.arnnect.remind.presentation.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.ssafy.arnnect.remind.application.dto.response.RemindQuizResponse;
import com.ssafy.arnnect.remind.application.service.RemindService;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/remind")
@RequiredArgsConstructor
public class RemindController {

    private final RemindService service;

    @GetMapping()
    public ResponseEntity<List<RemindQuizResponse>> getRemindQuiz() throws JsonProcessingException {
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(service.sendRemind(memberUuid));
    }
}
