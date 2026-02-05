package com.ssafy.arnnect.preference.presentation.controller;

import com.ssafy.arnnect.preference.application.dto.response.GenreWithArtworksResponse;
import com.ssafy.arnnect.preference.application.service.PreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/preference")
@RequiredArgsConstructor
public class PreferenceController {

    private final PreferenceService service;

    @GetMapping
    public ResponseEntity<List<GenreWithArtworksResponse>> getPreferenceList(){
        return ResponseEntity.ok(service.getRandomRecommendations());
    }
}
