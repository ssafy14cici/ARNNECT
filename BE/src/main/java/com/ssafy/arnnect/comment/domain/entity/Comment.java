package com.ssafy.arnnect.comment.domain.entity;

import com.ssafy.arnnect.comment.application.dto.request.UpdateCommentRequest;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id", nullable = false, updatable = false)
    private Long commentId;

    @Column(name = "member_id", nullable = false, updatable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", columnDefinition = "ENUM('REVIEW', 'ARTWORK')")
    private TargetType targetType;

    @Column(name = "target_id", nullable = false, updatable = false)
    private Integer targetId;

    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "parent_comment_id")
    private Integer parentCommentId;

    @CreatedDate
    @Column(name = "created_at", updatable = false,
            insertable = false, columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", insertable = false,
            columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", columnDefinition = "tinyint DEFAULT 0")
    private Boolean isDeleted = false;

    @Column(name = "deleted_at", insertable = false)
    private LocalDateTime deletedAt;

    public void updateComment(UpdateCommentRequest request){
        this.content = request.getContent();
    }

    public void deleteComment(){
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
    }
}
