package com.ssafy.arnnect.review.application.service;

import com.ssafy.arnnect.review.application.dto.request.CreateReviewRequest;
import com.ssafy.arnnect.review.application.dto.request.UpdateReviewRequest;
import com.ssafy.arnnect.review.application.dto.response.ReviewDetailResponse;
import com.ssafy.arnnect.review.domain.entity.ReviewDetail;
import com.ssafy.arnnect.review.application.dto.response.ReviewResponse;

import java.util.List;

public interface ReviewService {
    void createReview(String memberUuid, CreateReviewRequest request);

    void createReviewWithoutImg(String memberUuid, CreateReviewRequest request);
    void updateReview(String memberUuid, Long reviewId, UpdateReviewRequest request);
    void deleteReview(String memberUuid, Long reviewId);
    List<ReviewResponse> getReviewListOfArtwork(Long artworkId);
    List<ReviewResponse> getMyReviewList(String memberUuid);
    ReviewDetailResponse getReviewDetail(Long reviewId);
    List<ReviewResponse> getReviewFeedList();
}
