package com.ssafy.arnnect.follow.application.service;

import com.ssafy.arnnect.follow.application.dto.response.FollowArtistResponse;
import com.ssafy.arnnect.follow.application.dto.response.FollowMemberResponse;
import com.ssafy.arnnect.follow.application.dto.response.ToggleFollowResponse;

import java.util.List;

public interface FollowService {
    ToggleFollowResponse toggleFollow(String sourceMemberUuid, String targetMemberUuid);
    List<FollowArtistResponse> followArtistList(String memberUuid);
    List<FollowMemberResponse> followMemberList(String memberUuid);
}
