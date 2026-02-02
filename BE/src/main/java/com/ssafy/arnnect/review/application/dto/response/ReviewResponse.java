package com.ssafy.arnnect.review.application.dto.response;

import com.ssafy.arnnect.review.domain.entity.Review;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ReviewResponse {
    Long reviewId;
    String title;
    String imageUrl;

    public static ReviewResponse from(Review entity, String url){
        return ReviewResponse.builder()
                .reviewId(entity.getReviewId())
                .title(entity.getTitle())
                .imageUrl(url+entity.getSavedImageName())
                .build();
    }
}
