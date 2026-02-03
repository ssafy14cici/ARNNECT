package com.ssafy.arnnect.review.application.service;

import com.ssafy.arnnect.artwork.application.dto.response.ArtworkDetailResponse;
import com.ssafy.arnnect.artwork.domain.entity.Tag;
import com.ssafy.arnnect.artwork.repository.TagRepository;
import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.common.file.FileStorageService;
import com.ssafy.arnnect.common.file.FileType;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.review.application.dto.request.CreateReviewRequest;
import com.ssafy.arnnect.review.application.dto.request.UpdateReviewRequest;
import com.ssafy.arnnect.review.application.dto.response.ReviewDetailResponse;
import com.ssafy.arnnect.review.domain.entity.ReviewDetail;
import com.ssafy.arnnect.review.application.dto.response.ReviewResponse;
import com.ssafy.arnnect.review.domain.entity.Review;
import com.ssafy.arnnect.review.domain.entity.ReviewTag;
import com.ssafy.arnnect.review.repository.ReviewRepository;
import com.ssafy.arnnect.review.repository.ReviewTagRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewServiceImpl implements ReviewService{

    private final ReviewRepository repository;
    private final ReviewTagRepository reviewTagRepository;
    private final TagRepository tagRepository;
    private final MemberService memberService;
    private final FileStorageService fileService;

    @Override
    @Transactional
    public void createReview(String memberUuid, CreateReviewRequest request) {
        Map<String, String> imgList = null;
        Long memberId = memberService.getMemberId(memberUuid);
        try{
            imgList = fileService.saveFile(request.getImage(), FileType.REVIEW);
            createTag(request.getTags(), repository.save(request.toEntity(memberId, imgList)).getReviewId());
        }catch (Exception e){
            if(imgList != null) fileService.deleteFile(imgList.get("saved"),FileType.REVIEW);
        }
    }

    @Override
    public void createReviewWithoutImg(String memberUuid, CreateReviewRequest request) {
        Long memberId = memberService.getMemberId(memberUuid);
        createTag(request.getTags(), repository.save(request.toEntity(memberId)).getReviewId());
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
        List<Tag> tags = reviewTagRepository.getByReviewId(reviewId);
        System.out.println(repository.getReviewDetail(reviewId).orElseThrow(
                () -> new BusinessException(ErrorCode.REVIEW_NOT_FOUND)).toString());
        return ReviewDetailResponse.from(repository.getReviewDetail(reviewId).orElseThrow(
                () -> new BusinessException(ErrorCode.REVIEW_NOT_FOUND)), tags, fileService.getBaseDir(FileType.REVIEW));

    }


    private void createTag(List<String> tagNameList, Long reviewId){
        /**
         * 태그
         */
        //존재하는 태그
        List<Tag> existingTags = tagRepository.findAllByNameIn(tagNameList);
        Set<String> existingNames = existingTags.stream()
                .map(Tag::getName)
                .collect(Collectors.toSet());

        //새로운 태그 등록
        List<Tag> newTags = tagRepository.saveAll(tagNameList.stream()
                .filter(name -> !existingNames.contains(name))  // 기존 제외
                .map(name -> Tag.builder().name(name).build())
                .toList());

        // ArtworkTag 리스트 생성
        List<ReviewTag> allReviewTags = new ArrayList<>();

        // 기존 태그 → ArtworkTag 변환
        existingTags.forEach(tag ->
                allReviewTags.add(ReviewTag.builder()
                        .review(Review.builder().reviewId(reviewId).build())
                        .tag(Tag.builder().tagId(tag.getTagId()).build())
                        .build())
        );

        // 신규 태그 추가
        newTags.forEach(tag ->
                allReviewTags.add(ReviewTag.builder()
                        .review(Review.builder().reviewId(reviewId).build())
                        .tag(Tag.builder().tagId(tag.getTagId()).build())
                        .build())
        );

        reviewTagRepository.saveAll(allReviewTags);
    }
}
