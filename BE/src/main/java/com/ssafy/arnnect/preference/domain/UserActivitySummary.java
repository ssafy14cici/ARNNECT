package com.ssafy.arnnect.preference.domain;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_activity_summary")
@EntityListeners(AuditingEntityListener.class)
public class UserActivitySummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String memberUuid;
    private Long favoriteCnt;
    private Long commentCnt;
    @CreatedDate
    private LocalDateTime createdAt;
}
