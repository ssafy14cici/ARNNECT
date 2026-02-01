package com.ssafy.arnnect.artwork.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.Date;
import java.util.List;

@Getter
@Builder
public class DetailArtworkResponse {
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
//    List<String> tags;

    public void updateUrl(String basicUrl){
        this.imageUrl = basicUrl+imageUrl;
    }

}
