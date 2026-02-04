package com.ssafy.arnnect.follow.application.service;

import com.ssafy.arnnect.follow.application.dto.response.FollowArtistResponse;
import com.ssafy.arnnect.follow.application.dto.response.FollowMemberResponse;
import com.ssafy.arnnect.follow.application.dto.response.ToggleFollowResponse;
import com.ssafy.arnnect.follow.domain.entity.Follow;
import com.ssafy.arnnect.follow.domain.entity.FollowId;
import com.ssafy.arnnect.follow.repository.FollowRepository;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FollowServiceImpl implements FollowService{

    private final FollowRepository followRepository;
    private final MemberService memberService;
    private final MemberRepository memberRepository;

    @Override
    public ToggleFollowResponse toggleFollow(String sourceMemberUuid, String targetMemberUuid) {
        Long sourceMemberId = memberService.getMemberId(sourceMemberUuid);
        Long targetMemberId = memberService.getMemberId(targetMemberUuid);

        FollowId followId = new FollowId(sourceMemberId, targetMemberId);
        Follow follow = followRepository.findByFollowId(followId);
        if(follow == null){
            follow.createFollow(followId);
            followRepository.save(follow);
        }
        else{
            follow.deleteFollow(followId);
            followRepository.save(follow);
        }

        return ToggleFollowResponse.from(follow == null ? false : true, followRepository.countByFollowId(followId));
    }

    @Override
    public List<FollowArtistResponse> followArtistList(String memberUuid) {
        return List.of();
    }

    @Override
    public List<FollowMemberResponse> followMemberList(String memberUuid) {
        return List.of();
    }
}
