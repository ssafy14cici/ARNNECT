package com.ssafy.arnnect.follow.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FollowArtistResponse {
    private String memberUuid;
    private String artistName;
    private String type;

    public static FollowArtistResponse from(String memberUuid, String artistName, String type){
        return FollowArtistResponse.builder()
                .memberUuid(memberUuid)
                .artistName(artistName)
                .type(type)
                .build();
    }
}
