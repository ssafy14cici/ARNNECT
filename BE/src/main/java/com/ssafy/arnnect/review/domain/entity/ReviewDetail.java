package com.ssafy.arnnect.review.domain.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.sql.Timestamp;

@Getter
@AllArgsConstructor
@Builder
public class ReviewDetail {
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
}
