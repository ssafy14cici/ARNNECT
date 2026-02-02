package com.ssafy.arnnect.artwork.domain.entity;

import com.ssafy.arnnect.artwork.application.dto.request.UpdateArtworkRequest;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "artwork")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Artwork {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "artwork_id", nullable = false, updatable = false, columnDefinition = "BIGINT COMMENT '작품 ID'")
    private Long artworkId;

    @Column(name = "member_id", nullable = false, columnDefinition = "BIGINT COMMENT '회원 ID'")
    private Long memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genre_id")
    private ArtGenre genre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id")
    private ArtField field;

    @Column(name = "title", length = 100, nullable = false, columnDefinition = "VARCHAR(100) COMMENT '작품명'")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT COMMENT '작품설명'")
    private String description;

    @Column(name = "production_date", columnDefinition = "DATE COMMENT '제작연도'")
    private LocalDate productionDate;

    @Column(name = "size", length = 50, columnDefinition = "VARCHAR(50) COMMENT '작품크기'")
    private String size;

    @Column(name = "saved_image_name", length = 255, nullable = false, columnDefinition = "VARCHAR(255) COMMENT '저장된 이미지 이름'")
    private String savedImageName;

    @Column(name = "origin_image_name", length = 255, nullable = false, columnDefinition = "VARCHAR(255) COMMENT '원본 이미지 이름'")
    private String originImageName;

    @CreatedDate
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;


    public void updateArtwork(UpdateArtworkRequest request){
        this.title = request.getTitle();
        this.description = request.getDescription();
        this.field = ArtField.builder().fieldId(request.getFieldId()).build();
        this.genre = ArtGenre.builder().genreId(request.getGenreId()).build();
        this.productionDate = request.getProductionDate();
        this.size = request.getSize();
    }

    public void updateImage(Map<String,String> imageName){
        this.savedImageName = imageName.get("saved");
        this.originImageName = imageName.get("origin");
    }

    public void deleteArtwork(){
        this.isDeleted = true;
    }
}