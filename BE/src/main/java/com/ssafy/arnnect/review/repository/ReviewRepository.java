package com.ssafy.arnnect.review.repository;

import com.ssafy.arnnect.review.application.dto.response.ReviewQuizResponse;
import com.ssafy.arnnect.review.domain.entity.ReviewDetail;
import com.ssafy.arnnect.review.domain.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByReviewIdAndMemberId(Long reviewId, Long memberId);
    List<Review> findByArtworkIdAndIsDeletedOrderByReviewIdDesc(Long artworkId, Boolean isDeleted);
    List<Review> findByMemberIdAndIsDeletedOrderByReviewIdDesc(Long memberId, Boolean isDeleted);
    List<Review> findAllByOrderByReviewIdDesc();

    @Query(value = """
        select\s
            r.review_id as reviewId,
             r.artwork_id as artworkId,
             a.title as artworkTitle,
             r.title as title,
             r.content as content,
             r.saved_image_name as imageUrl,
             r.created_at as createdAt,
             m.member_uuid as memberUuid,
             m.nickname as nickname,
             ar_member.member_uuid as artistUuid,
             ar_member.nickname as artistName
        from review r\s
        left join artwork a on r.artwork_id = a.artwork_id\s
        left join member m on m.member_id = r.member_id\s
        LEFT JOIN artist ar ON ar.member_id = a.member_id\s
        LEFT JOIN member ar_member ON ar_member.member_id = ar.member_id \s
        where r.review_id = :reviewId and r.is_deleted = false
    """, nativeQuery = true)
    Optional<ReviewDetail> getReviewDetail(Long reviewId);

    @Query(value = """
        select 
            r.review_id,
            r.title,
            r.content as review
        from review r
        where r.member_id = :memberId
        ORDER BY RAND()
        LIMIT 10;
    """, nativeQuery = true)
    List<ReviewQuizResponse> getReviewQuizList(Long memberId);
}
