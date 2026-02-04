package com.ssafy.arnnect.follow.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FollowMemberResponse {
    private String memberUuid;
    private String nickName;
    private String type;

    public static FollowMemberResponse from(String memberUuid, String nickName, String type){
        return FollowMemberResponse.builder()
                .memberUuid(memberUuid)
                .nickName(nickName)
                .type(type)
                .build();
    }
}
