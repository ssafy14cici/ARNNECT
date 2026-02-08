package com.ssafy.arnnect.preference.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
@Entity
@Table(name = "user_artwork_score")
@EntityListeners(AuditingEntityListener.class)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserArtworkScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String memberUuid;
    private Long artworkId;
    private Long score;
    @CreatedDate
    private LocalDateTime createdAt;

    public void addScore(Long count) {
        this.score += count;
    }
}
