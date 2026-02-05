package com.ssafy.arnnect.follow.application.service;

import com.ssafy.arnnect.follow.application.dto.response.FollowArtistResponse;
import com.ssafy.arnnect.follow.application.dto.response.FollowMemberResponse;
import com.ssafy.arnnect.follow.application.dto.response.ToggleFollowResponse;
import com.ssafy.arnnect.follow.domain.entity.Follow;
import com.ssafy.arnnect.follow.repository.FollowRepository;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import com.ssafy.arnnect.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FollowServiceImpl implements FollowService{

    private final FollowRepository followRepository;
    private final MemberService memberService;
    private final MemberRepository memberRepository;

    @Override
    @Transactional
    public ToggleFollowResponse toggleFollow(String sourceMemberUuid, String targetMemberUuid) {
        Long sourceMemberId = memberService.getMemberId(sourceMemberUuid);
        Long targetMemberId = memberService.getMemberId(targetMemberUuid);

        Optional<Follow> existingFollow = followRepository.findBySourceIdAndTargetId(sourceMemberId, targetMemberId);
        boolean isFollowing;

        if (existingFollow.isEmpty()) {
            Follow follow = Follow.builder()
                    .sourceId(sourceMemberId)
                    .targetId(targetMemberId)
                    .build();
            followRepository.save(follow);
            isFollowing = true;
        } else {
            followRepository.deleteBySourceIdAndTargetId(sourceMemberId, targetMemberId);
            isFollowing = false;
        }

        int followerCount = followRepository.countByTargetId(targetMemberId);
        return ToggleFollowResponse.from(isFollowing, followerCount);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowArtistResponse> followArtistList(String memberUuid) {
        Long memberId = memberService.getMemberId(memberUuid);
        List<Follow> followList = followRepository.findBySourceId(memberId);

        return followList.stream()
                .map(follow -> memberRepository.findById(follow.getTargetId()).orElse(null))
                .filter(member -> member != null && member.getRole() == UserRole.ARTIST)
                .map(member -> FollowArtistResponse.from(
                        member.getMemberUuid(),
                        member.getNickname(),
                        member.getRole().name()
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowMemberResponse> followMemberList(String memberUuid) {
        Long memberId = memberService.getMemberId(memberUuid);
        List<Follow> followList = followRepository.findBySourceId(memberId);

        return followList.stream()
                .map(follow -> memberRepository.findById(follow.getTargetId()).orElse(null))
                .filter(member -> member != null && member.getRole() == UserRole.GENERAL)
                .map(member -> FollowMemberResponse.from(
                        member.getMemberUuid(),
                        member.getNickname(),
                        member.getRole().name()
                ))
                .collect(Collectors.toList());
    }
}
