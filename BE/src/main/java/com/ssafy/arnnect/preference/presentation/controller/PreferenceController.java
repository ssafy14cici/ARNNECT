package com.ssafy.arnnect.preference.presentation.controller;

import com.ssafy.arnnect.preference.application.dto.request.ResultArtworkIdRequest;
import com.ssafy.arnnect.preference.application.dto.response.GenreWithArtworksResponse;
import com.ssafy.arnnect.preference.application.dto.response.ResultMBTIResponse;
import com.ssafy.arnnect.preference.application.service.PreferenceService;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/preference")
@RequiredArgsConstructor
@Slf4j
public class PreferenceController {

    private final PreferenceService service;

    @GetMapping
    public ResponseEntity<List<GenreWithArtworksResponse>> getPreferenceList(){
        return ResponseEntity.ok(service.getRandomRecommendations());
    }

    @PostMapping
    public ResponseEntity<String> saveMBTIResult(@RequestBody ResultArtworkIdRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(service.saveMBTIResult(memberUuid, request));
    }
}
