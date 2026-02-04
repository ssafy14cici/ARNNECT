package com.ssafy.arnnect.follow.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;

@Entity
@Table(name = "follow")
@IdClass(FollowId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class Follow {
    @Id
    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Id
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public void createFollow(FollowId followId){
        this.sourceId = followId.getSourceId();
        this.targetId = followId.getTargetId();
    }

    public void deleteFollow(FollowId followId){
        this.sourceId = followId.getSourceId();
        this.targetId = followId.getTargetId();
    }
}
