package com.ssafy.arnnect.preference.domain;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
@Entity
@Table(name = "user_genre_score")
@EntityListeners(AuditingEntityListener.class)
public class UserGenreScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String memberUuid;
    private Long genreId;
    private Long score;
    @CreatedDate
    private LocalDateTime createdAt;
}
