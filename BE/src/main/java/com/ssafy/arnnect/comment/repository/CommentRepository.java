package com.ssafy.arnnect.comment.repository;

import com.ssafy.arnnect.comment.domain.entity.Comment;
import com.ssafy.arnnect.comment.domain.entity.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTargetTypeAndTargetIdAndIsDeletedFalseOrderByCommentIdAsc(TargetType targetType, Integer targetId);
    long countByTargetTypeAndTargetIdAndIsDeletedFalse(TargetType targetType, Integer targetId);
    Comment getCommentsByCommentId(Long commentId);

    Optional<Comment> findByCommentIdAndMemberId(Long commentId, Long memberId);

    long countByMemberIdAndIsDeletedFalse(Long memberId);
}
