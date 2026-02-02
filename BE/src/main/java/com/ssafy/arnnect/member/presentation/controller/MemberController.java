package com.ssafy.arnnect.member.presentation.controller;

import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateMemberRequest;
import com.ssafy.arnnect.member.application.dto.response.MemberInfoResponse;
import com.ssafy.arnnect.member.application.dto.response.MyInfoResponse;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Slf4j
@RestController
@RequestMapping("/api/v1/member")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService service;

    //사용자 등록
    @PostMapping("/users/signup")
    public ResponseEntity<Void> createMember(@ModelAttribute CreateMemberRequest request) throws IOException {
        service.createMember(request);
        return ResponseEntity.ok().build();
    }

    //사용자 수정
    @PutMapping("/users/my")
    public ResponseEntity<Void> putMember(@ModelAttribute UpdateMemberRequest request) throws IOException {
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.updateMember(request, memberUuid);
        return ResponseEntity.ok().build();
    }

    //예술인 회원가입
    @PostMapping("/artist/signup")
    public ResponseEntity<Void> createArtist(@ModelAttribute CreateArtistRequest request) throws IOException {
        service.createArtist(request);
        return ResponseEntity.ok().build();
    }

    //예술인 수정
    @PutMapping("/artist/my")
    public ResponseEntity<Void> putArtist(@ModelAttribute UpdateArtistRequest request) throws IOException {
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.updateArtist(request, memberUuid);
        return ResponseEntity.ok().build();
    }

    //삭제
    @DeleteMapping("/{memberUuid}")
    public ResponseEntity<Void> deleteMember(@PathVariable String memberUuid) throws IOException {
        service.deleteMember(memberUuid);
        return ResponseEntity.ok().build();
    }

    //내 조회
    @GetMapping("/my")
    public ResponseEntity<MyInfoResponse> getMyInfo(){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        UserRole role = SecurityUtil.getCurrentUserRole();
        return ResponseEntity.ok(service.getMyInfo(memberUuid, role));
    }

    //프로필 조회
    @GetMapping("/{memberUuid}")
    public ResponseEntity<MemberInfoResponse> getMemberInfo(@PathVariable String memberUuid){
        String myUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(service.getMemberInfo(myUuid, memberUuid));
    }

}
