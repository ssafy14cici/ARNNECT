package com.ssafy.arnnect.comment.application.dto.request;

import com.ssafy.arnnect.comment.domain.entity.Comment;
import com.ssafy.arnnect.comment.domain.entity.TargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class CreateCommentRequest {
    @NotNull(message = "댓글 작성 대상 타입(REVIEW, ARTWORK)은 필수입니다.")
    TargetType targetType;

    @NotNull(message = "대상 ID는 필수입니다.")
    Integer targetId;

    @NotBlank(message = "댓글 내용은 필수입니다")
    String content;

    Integer parentCommentId;

    public Comment toEnity(Long memberId){
        return Comment.builder()
                .memberId(memberId)
                .targetType(this.targetType)
                .targetId(this.targetId)
                .content(this.content)
                .parentCommentId(this.parentCommentId)
                .build();
    }
}
