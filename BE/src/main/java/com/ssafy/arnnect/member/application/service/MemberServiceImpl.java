package com.ssafy.arnnect.member.application.service;

import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.domain.entity.Artist;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService{

    private final MemberRepository repository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void createMember(CreateMemberRequest request) {
        Member member = request.toMemberEntity();
        member.encodePassword(passwordEncoder.encode(member.getPassword()));
        log.info("사용자 회원가입 : member => {}",member.toString());
        repository.save(member);
    }

    @Override
    public void createArtist(CreateArtistRequest request) {
        Member member = request.toMemberEntity();
        Artist artist = request.toArtistEntity();
        log.info("예술가 회원가입 : member => {}",member.toString());
        //두개 저장
    }

    @Override
    public int updateMember() {
        return 0;
    }

    @Override
    public int updateArtist() {
        return 0;
    }

    @Override
    public int deleteMember(String memberUuid) {
        return 0;
    }
}
