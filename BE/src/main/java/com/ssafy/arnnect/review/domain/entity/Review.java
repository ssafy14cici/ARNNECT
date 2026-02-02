package com.ssafy.arnnect.review.domain.entity;

import com.ssafy.arnnect.review.application.dto.request.UpdateReviewRequest;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id", nullable = false, updatable = false, columnDefinition = "BIGINT COMMENT '감상평 ID'")
    private Long reviewId;

    @Column(name = "artwork_id")
    private Long artworkId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "saved_image_name", length = 255)
    private String savedImageName;

    @Column(name = "origin_image_name", length = 255)
    private String originImageName;

    @CreatedDate
    @Column(name = "created_at", updatable = false,
            insertable = false, columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", insertable = false,
            columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", columnDefinition = "tinyint DEFAULT 0")
    private Boolean isDeleted = false;

    @Column(name = "deleted_at", insertable = false)
    private LocalDateTime deletedAt;

    public void updateReview(UpdateReviewRequest request, Map<String, String> imageList){
        if(request.getArtworkId() != this.artworkId) this.artworkId = request.getArtworkId();
        if(!request.getTitle().equals(this.title) ) this.title = request.getTitle();
        if(!request.getContent().equals(this.content) ) this.content = request.getContent();
        this.originImageName = imageList.get("origin");
        this.savedImageName = imageList.get("saved");
    }

    public void deletedReview(){
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
    }
}
