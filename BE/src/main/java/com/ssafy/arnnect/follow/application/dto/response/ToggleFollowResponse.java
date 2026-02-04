package com.ssafy.arnnect.follow.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ToggleFollowResponse {
    private boolean isFollowing;
    private Integer followerCount;

    public static ToggleFollowResponse from(boolean isFollowing, Integer followerCount){
        return ToggleFollowResponse.builder()
                .isFollowing(isFollowing)
                .followerCount(followerCount)
                .build();
    }
}
