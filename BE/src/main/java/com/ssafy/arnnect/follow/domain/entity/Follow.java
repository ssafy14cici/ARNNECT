package com.ssafy.arnnect.follow.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "follow")
@IdClass(FollowId.class)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Follow {
    @Id
    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Id
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
