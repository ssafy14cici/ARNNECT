package com.ssafy.arnnect.comment.application.dto.response;

import com.ssafy.arnnect.comment.domain.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@Builder
@NoArgsConstructor
public class CommentResponse {
    private String targetType;
    private Integer targetId;
    private Long commentId;
    private String content;
    private String nickName;
    private Integer parentCommentId;

    public static CommentResponse from(Comment comment, String nickName) {
        return CommentResponse.builder()
                .targetType(comment.getTargetType().name())
                .targetId(comment.getTargetId())
                .commentId(comment.getCommentId())
                .content(comment.getContent())
                .nickName(nickName)
                .parentCommentId(comment.getParentCommentId())
                .build();
    }
}
