package com.ssafy.arnnect.artwork.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ArtworkResponse {
    Long artworkId;
    String memberUuid;
    String nickname;
    String title;
    String imageUrl;
    Long likeCount;

    public void updateUrl(String basicUrl){
        this.imageUrl = basicUrl+imageUrl;
    }

}
