package com.ssafy.arnnect.member.application.service;

import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.application.dto.response.MemberInfoResponse;
import com.ssafy.arnnect.member.application.dto.response.MyInfoResponse;
import com.ssafy.arnnect.member.domain.entity.Artist;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import com.ssafy.arnnect.member.repository.ArtistRepository;
import com.ssafy.arnnect.member.repository.MemberRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService{

    private final MemberRepository memberRepo;
    private final ArtistRepository artistRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void createMember(CreateMemberRequest request) {
        Member member = request.toMemberEntity();
        member.encodePassword(passwordEncoder.encode(member.getPassword()));
        log.info("사용자 회원가입 : member => {}",member.toString());
        memberRepo.save(member);
    }

    @Override
    @Transactional
    public void createArtist(CreateArtistRequest request) {
        Member member = request.toMemberEntity();
        member.encodePassword(passwordEncoder.encode(member.getPassword()));


        log.info("예술가 회원가입 : member => {}",member.toString());

        Artist artist = request.toArtistEntity(memberRepo.save(member));
        artistRepo.save(artist);
    }

    @Override
    public void updateMember() {

    }

    @Override
    public void updateArtist() {

    }

    @Override
    public void deleteMember(String memberUuid) {

    }

    @Override
    public MyInfoResponse getMyInfo(String memberUuid, UserRole role) {
        if(UserRole.GENERAL.equals(role)){
            return MyInfoResponse.fromMember(memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                    ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)
            ));
        }else{
            return MyInfoResponse.fromArtist(artistRepo.findByMember_MemberUuid(memberUuid).orElseThrow(
                    ()->new BusinessException(ErrorCode.USER_NOT_FOUND)
            ));
        }
    }

    @Override
    public MemberInfoResponse getMemberInfo(String myUuid,String memberUuid) {
        return memberRepo.findMemberInfo(memberUuid,memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)).getMemberId());
    }
}
