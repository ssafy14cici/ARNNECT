package com.ssafy.arnnect.review.presentation.controller;

import com.ssafy.arnnect.review.application.dto.request.CreateReviewRequest;
import com.ssafy.arnnect.review.application.dto.request.UpdateReviewRequest;
import com.ssafy.arnnect.review.application.dto.response.ReviewDetailResponse;
import com.ssafy.arnnect.review.application.dto.response.ReviewResponse;
import com.ssafy.arnnect.review.application.service.ReviewService;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {
    private final ReviewService service;

    @PostMapping
    public ResponseEntity<Void> createReview(CreateReviewRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createReview(memberUuid, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("{reviewId}")
    public ResponseEntity<Void> putReview(@PathVariable Long reviewId, UpdateReviewRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.updateReview(memberUuid, reviewId,request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("{reviewId}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long reviewId){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.deleteReview(memberUuid, reviewId);
        return ResponseEntity.ok().build();
    }

    @GetMapping()
    public ResponseEntity<List<ReviewResponse>> getReviewListOfArtwork(@RequestParam Long artworkId){
        return ResponseEntity.ok(service.getReviewListOfArtwork(artworkId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<ReviewResponse>> getMyReviewList(){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(service.getMyReviewList(memberUuid));
    }

    @GetMapping("{reviewId}")
    public ResponseEntity<ReviewDetailResponse> getReviewDetail(@PathVariable Long reviewId){
        return ResponseEntity.ok(service.getReviewDetail(reviewId));
    }
}
