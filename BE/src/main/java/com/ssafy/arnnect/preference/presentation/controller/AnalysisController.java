package com.ssafy.arnnect.preference.presentation.controller;

import com.ssafy.arnnect.preference.application.dto.response.AnalysisListResponse;
import com.ssafy.arnnect.preference.application.service.AnalysisService;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService service;

    @GetMapping
    public ResponseEntity<AnalysisListResponse> getAnalysisList(){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(service.getAnalysisList(memberUuid));
    }
}