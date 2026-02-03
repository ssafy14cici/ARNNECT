package com.ssafy.arnnect.review.application.dto.response;

import com.ssafy.arnnect.artwork.domain.entity.Tag;
import com.ssafy.arnnect.review.domain.entity.ReviewDetail;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.sql.Timestamp;
import java.util.List;

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
    List<String> tags;

    public static ReviewDetailResponse from(ReviewDetail detail, List<Tag> tags, String basicUrl){
        return ReviewDetailResponse.builder()
                .reviewId(detail.getReviewId())
                .artworkId(detail.getArtworkId())
                .artworkTitle(detail.getArtworkTitle())
                .title(detail.getTitle())
                .content(detail.getContent())
                .imageUrl(detail.getImageUrl()!= null ? basicUrl + detail.getImageUrl() : null)
                .createdAt(detail.getCreatedAt())
                .memberUuid(detail.getMemberUuid())
                .nickname(detail.getNickname())
                .artistUuid(detail.getArtistUuid())       // 또는 memberUuid
                .artistName(detail.getArtistName())
                .tags(tags.stream().map(Tag::getName).toList())
                .build();
    }
}
