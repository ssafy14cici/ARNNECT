package com.ssafy.arnnect.artwork.presentation.controller;

import com.ssafy.arnnect.artwork.application.dto.request.FavoriteRequest;
import com.ssafy.arnnect.artwork.application.service.ArtworkService;
import com.ssafy.arnnect.security.SecurityUtil;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {
    private final ArtworkService service;

    @PostMapping
    public ResponseEntity<Boolean> toggleFavorite(@RequestBody FavoriteRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(service.toggleFavorite(memberUuid, request.getArtworkId()));
    }
}
