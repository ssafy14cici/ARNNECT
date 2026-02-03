package com.ssafy.arnnect.fanletter.presentation.controller;

import com.ssafy.arnnect.fanletter.application.dto.request.AnswerRequest;
import com.ssafy.arnnect.fanletter.application.dto.request.FanLetterRequest;
import com.ssafy.arnnect.fanletter.application.dto.response.FanLetterResponse;
import com.ssafy.arnnect.fanletter.application.service.FanLetterService;
import com.ssafy.arnnect.security.SecurityUtil;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fanletters")
@RequiredArgsConstructor
public class FanLetterController {
    private final FanLetterService service;
    @PostMapping
    public ResponseEntity<Void> createFanLetter(@RequestBody FanLetterRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createFanLetter(memberUuid, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("{fanLetterId}")
    public ResponseEntity<Void> updateFanLetter(@PathVariable Long fanLetterId, @RequestBody FanLetterRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.updateFanLetter(fanLetterId, memberUuid, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("{fanLetterId}")
    public ResponseEntity<Void> deleteFanLetter(@PathVariable Long fanLetterId){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.deleteFanLetter(memberUuid, fanLetterId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("{fanLetterId}/answer")
    public ResponseEntity<Void> createAnswer(@PathVariable Long fanLetterId, @RequestBody AnswerRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createAnswer(fanLetterId, memberUuid, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("{fanLetterId}/answer")
    public ResponseEntity<Void> updateAnswer(@PathVariable Long fanLetterId, @RequestBody AnswerRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createAnswer(fanLetterId, memberUuid, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("{fanLetterId}/answer")
    public ResponseEntity<Void> deleteAnswer(@PathVariable Long fanLetterId){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.deleteAnswer(fanLetterId, memberUuid);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/all")
    public ResponseEntity<List<FanLetterResponse>> getFanLetterList(@RequestParam String artist){
        return ResponseEntity.ok(service.getFanLetterList(artist));
    }
}
