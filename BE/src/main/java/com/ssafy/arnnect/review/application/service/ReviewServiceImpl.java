package com.ssafy.arnnect.review.application.service;

import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.common.file.FileStorageService;
import com.ssafy.arnnect.common.file.FileType;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.review.application.dto.request.CreateReviewRequest;
import com.ssafy.arnnect.review.application.dto.request.UpdateReviewRequest;
import com.ssafy.arnnect.review.application.dto.response.ReviewDetailResponse;
import com.ssafy.arnnect.review.application.dto.response.ReviewResponse;
import com.ssafy.arnnect.review.domain.entity.Review;
import com.ssafy.arnnect.review.repository.ReviewRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewServiceImpl implements ReviewService{

    private final ReviewRepository repository;
    private final MemberService memberService;
    private final FileStorageService fileService;

    @Override
    @Transactional
    public void createReview(String memberUuid, CreateReviewRequest request) {
        Map<String, String> imgList = null;
        Long memberId = memberService.getMemberId(memberUuid);
        try{
            imgList = fileService.saveFile(request.getImage(), FileType.REVIEW);
            repository.save(request.toEntity(memberId, imgList));
        }catch (Exception e){
            if(imgList != null) fileService.deleteFile(imgList.get("saved"),FileType.REVIEW);
        }
    }

    @Override
    @Transactional
    public void updateReview(String memberUuid, Long reviewId, UpdateReviewRequest request) {
        Map<String, String> imgList = null;
        Long memberId = memberService.getMemberId(memberUuid);
        Review review = repository.findByReviewIdAndMemberId(reviewId, memberId).orElseThrow(
                ()-> new BusinessException(ErrorCode.REVIEW_NOT_FOUND));
        String origin_saved = review.getSavedImageName();
        try{
            imgList = fileService.saveFile(request.getImage(), FileType.REVIEW);
            review.updateReview(request, imgList);
            fileService.deleteFile( origin_saved, FileType.REVIEW);
        }catch (Exception e){
            if(imgList != null) fileService.deleteFile(imgList.get("saved"),FileType.REVIEW);
        }
    }

    @Override
    @Transactional
    public void deleteReview(String memberUuid, Long reviewId) {
        Long memberId = memberService.getMemberId(memberUuid);
        Review review = repository.findByReviewIdAndMemberId(reviewId, memberId).orElseThrow(
                ()-> new BusinessException(ErrorCode.REVIEW_NOT_FOUND));

        review.deletedReview();
        fileService.deleteFile(review.getSavedImageName(), FileType.REVIEW);
    }

    @Override
    public List<ReviewResponse> getReviewListOfArtwork(Long artworkId) {
        return repository.findByArtworkIdAndIsDeletedOrderByReviewIdDesc(artworkId, false)
                .stream().map((review)->ReviewResponse.from(review, fileService.getBaseDir(FileType.REVIEW))).toList();
    }

    @Override
    public List<ReviewResponse> getMyReviewList(String memberUuid) {
        return repository.findByMemberIdAndIsDeletedOrderByReviewIdDesc(memberService.getMemberId(memberUuid), false)
                .stream().map((review)->ReviewResponse.from(review, fileService.getBaseDir(FileType.REVIEW))).toList();
    }

    @Override
    public ReviewDetailResponse getReviewDetail(Long reviewId) {
        ReviewDetailResponse review = repository.getReviewDetail(reviewId).orElseThrow(
                () -> new BusinessException(ErrorCode.REVIEW_NOT_FOUND));
        review.updateImageUrl(fileService.getBaseDir(FileType.REVIEW));
        log.info("review : {}", review);
        return review;
    }
}
