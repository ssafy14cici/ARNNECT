package com.ssafy.arnnect.artwork.presentation.controller;

import com.ssafy.arnnect.artwork.application.dto.request.CreateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.request.UpdateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.response.*;
import com.ssafy.arnnect.artwork.domain.entity.ArtworkDetail;
import com.ssafy.arnnect.artwork.application.service.ArtworkService;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/artworks")
@RequiredArgsConstructor
public class ArtworkController {

    private final ArtworkService service;
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> createArtwork(@ModelAttribute CreateArtworkRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createArtwork(memberUuid, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("{artworkId}")
    public ResponseEntity<Void> updateArtwork(@PathVariable Long artworkId, @ModelAttribute UpdateArtworkRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.updateArtwork(memberUuid, artworkId, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("{artworkId}")
    public ResponseEntity<Void> deleteArtwork(@PathVariable Long artworkId){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.deleteArtwork(memberUuid, artworkId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("{artworkId}")
    public ResponseEntity<ArtworkDetailResponse> getDetailArtwork(@PathVariable Long artworkId){
        return ResponseEntity.ok(service.getDetailArtwork(artworkId));
    }

    @GetMapping("/feed")
    public ResponseEntity<List<ArtworkResponse>> getArtworkList(){
        return ResponseEntity.ok(service.getArtworkList());
    }

    @GetMapping()
    public ResponseEntity<List<ArtworkResponse>> getArtworkListOfArtist(@RequestParam String artist){
        return ResponseEntity.ok(service.getArtworkListOfArtist(artist));
    }

    @GetMapping("/new")
    public ResponseEntity<List<NewArtistRepresentativeResponse>> getNewArtist(){
        return ResponseEntity.ok(service.getNewArtist());
    }

    @GetMapping("/field")
    public ResponseEntity<List<FieldResponse>> getFieldList(){
        return ResponseEntity.ok(service.getFeildList());
    }

    @GetMapping("/genre")
    public ResponseEntity<List<GenreResponse>> getGenreList(@RequestParam Integer fieldId){
        return ResponseEntity.ok(service.getGenreList(fieldId));
    }
}
