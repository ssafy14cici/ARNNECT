package com.ssafy.arnnect.artwork.domain.entity;

import com.ssafy.arnnect.artwork.domain.entity.Artwork;
import com.ssafy.arnnect.member.domain.entity.Member;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "favorite_artwork")
@IdClass(FavoriteArtworkId.class)
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class FavoriteArtwork {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artwork_id", nullable = false)
    @Comment("작품 ID")
    private Artwork artwork;

    @Column(name = "is_favorite", nullable = false)
    private boolean isFavorite;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    @Comment("좋아요 시간")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void toggleFavorite() {
        this.isFavorite = !this.isFavorite;
        this.updatedAt = LocalDateTime.now();
    }
}
