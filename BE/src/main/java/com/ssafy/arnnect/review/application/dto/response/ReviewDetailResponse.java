package com.ssafy.arnnect.review.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.sql.Timestamp;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@Builder
public class ReviewDetailResponse {
    Long reviewId;
    Long artworkId;
    String artworkTitle;
    String title;
    String content;
    String imageUrl;
    Timestamp createdAt;
    String memberUuid;
    String nickname;
    String artistUuid; //memberUuid
    String artistName;
//    List<String> tags;

    public void updateImageUrl(String url){
        this.imageUrl = url+this.imageUrl;
    }



}
