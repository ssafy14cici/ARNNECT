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
    public ResponseEntity<Void> createMember(
            @RequestPart("data") CreateMemberRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        service.createMember(request, file);
        return ResponseEntity.ok().build();
    }

    //사용자 수정
    @PutMapping("/users/my")
    public ResponseEntity<Void> putMember(
            @RequestPart("data") UpdateMemberRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        service.updateMember(request, file);
        return ResponseEntity.ok().build();
    }

    //예술인 회원가입
    @PostMapping("/artist/signup")
    public ResponseEntity<Void> createArtist(
            @RequestPart("data") CreateArtistRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        service.createArtist(request, file);
        return ResponseEntity.ok().build();
    }

    //예술인 수정
    @PutMapping("/artist/my")
    public ResponseEntity<Void> putArtist(
            @RequestPart("data") UpdateArtistRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        service.updateArtist(request, file);
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
