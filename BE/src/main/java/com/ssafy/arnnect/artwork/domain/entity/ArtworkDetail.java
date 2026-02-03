package com.ssafy.arnnect.artwork.domain.entity;

import lombok.Builder;
import lombok.Getter;

import java.util.Date;

@Getter
@Builder
public class ArtworkDetail {
    Long artworkId;
    String memberUuid;
    String nickname;
    Integer fieldId;
    String fieldName;
    Integer genreId;
    String genreName;
    String title;
    String description;
    Date productionDate;
    String size;
    String imageUrl;
    Long likeCount;

    public void updateUrl(String basicUrl){
        this.imageUrl = basicUrl+imageUrl;
    }

}
