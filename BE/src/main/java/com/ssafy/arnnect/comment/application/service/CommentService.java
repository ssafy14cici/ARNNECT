package com.ssafy.arnnect.comment.application.service;

import com.ssafy.arnnect.comment.application.dto.request.CreateCommentRequest;
import com.ssafy.arnnect.comment.application.dto.request.UpdateCommentRequest;
import com.ssafy.arnnect.comment.application.dto.response.CommentResponse;
import com.ssafy.arnnect.comment.domain.entity.TargetType;

import java.util.List;

public interface CommentService {
    void createComment(CreateCommentRequest request, String memberUuid);
    void updateComment(UpdateCommentRequest request, Long reviewId, String memberUuid);
    void deleteComment(String memberUuid, Long commentId);
    List<CommentResponse> getCommentList(Integer artWorkId, TargetType targetType);
    Integer getCommentCount(TargetType targetType, Integer targetId);
    Integer getMyCommentCount(String memberUuid);
}
