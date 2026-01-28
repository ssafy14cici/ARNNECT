package com.ssafy.arnnect.member.presentation.controller;

import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateMemberRequest;
import com.ssafy.arnnect.member.application.dto.response.MyInfoResponse;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/member")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService service;

    //사용자 등록
    @PostMapping("/users/signup")
    public ResponseEntity<Void> createMember(@RequestBody CreateMemberRequest request){
        service.createMember(request);
        return ResponseEntity.ok().build();
    }

    //사용자 수정
    @PutMapping("/users/my")
    public ResponseEntity<Void> putMember(@RequestBody UpdateMemberRequest request){
        return ResponseEntity.ok().build();
    }

    //예술인 회원가입
    @PostMapping("/artist/signup")
    public ResponseEntity<Void> createArtist(@RequestBody CreateArtistRequest request){
        service.createArtist(request);
        return ResponseEntity.ok().build();
    }

    //예술인 수정
    @PutMapping("/artist/my")
    public ResponseEntity<Void> putArtist(@RequestBody UpdateMemberRequest request){
        return ResponseEntity.ok().build();
    }

    //삭제
    @DeleteMapping("/{memberUuid}")
    public ResponseEntity<Void> DeleteMember(@PathVariable String memberUuid){
        return ResponseEntity.ok().build();
    }

    //내 조회
    @GetMapping("/my")
    public ResponseEntity<MyInfoResponse> GetMyInfo(){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        UserRole role = SecurityUtil.getCurrentUserRole();
        return ResponseEntity.ok(service.getMyInfo(memberUuid, role));
    }

    //프로필 조회
    @GetMapping("/{memberUuid}")
    public ResponseEntity<Void> GetMemberInfo(@PathVariable String memberUuid){
        return ResponseEntity.ok().build();
    }

}
