package com.ssafy.arnnect.comment.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateCommentRequest {
    @NotNull(message = "댓글 ID는 비어있을 수 없습니다")
    Long commentId;

    @NotBlank(message = "수정할 댓글 내용은 비어있을 수 없습니다.")
    String content;
}