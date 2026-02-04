package com.ssafy.arnnect.follow.presentation.controller;

import com.ssafy.arnnect.follow.application.dto.response.FollowArtistResponse;
import com.ssafy.arnnect.follow.application.dto.response.FollowMemberResponse;
import com.ssafy.arnnect.follow.application.dto.response.ToggleFollowResponse;
import com.ssafy.arnnect.follow.application.service.FollowService;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/{targetMemberUuid}")
    public ResponseEntity<ToggleFollowResponse> toggleFollow(@PathVariable String targetMemberUuid) {
        String sourceMemberUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(followService.toggleFollow(sourceMemberUuid, targetMemberUuid));
    }

    @GetMapping("/{memberUuid}/artist")
    public ResponseEntity<List<FollowArtistResponse>> getFollowArtistList(@PathVariable String memberUuid) {
        return ResponseEntity.ok(followService.followArtistList(memberUuid));
    }

    @GetMapping("/{memberUuid}/user")
    public ResponseEntity<List<FollowMemberResponse>> getFollowMemberList(@PathVariable String memberUuid) {
        return ResponseEntity.ok(followService.followMemberList(memberUuid));
    }
}
