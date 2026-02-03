package com.ssafy.arnnect.review.repository;

import com.ssafy.arnnect.artwork.domain.entity.Tag;
import com.ssafy.arnnect.review.domain.entity.ReviewTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewTagRepository extends JpaRepository<ReviewTag, Long> {
    @Modifying
    @Query("DELETE FROM ReviewTag at WHERE at.review.reviewId = :reviewId")
    void deleteByReviewId(@Param("reviewId") Long reviewId);

    @Query(value = """
        select t.tag_id ,t.name 
        from review_tag rt
        left join tag t on rt.tag_id = t.tag_id 
        where rt.review_id = :reviewId;
    """,nativeQuery = true)
    List<Tag> getByReviewId(@Param("reviewId") Long reviewId);
}
