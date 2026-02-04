package com.ssafy.arnnect.comment.application.service;

import com.ssafy.arnnect.comment.application.dto.request.CreateCommentRequest;
import com.ssafy.arnnect.comment.application.dto.request.UpdateCommentRequest;
import com.ssafy.arnnect.comment.application.dto.response.CommentResponse;
import com.ssafy.arnnect.comment.domain.entity.Comment;
import com.ssafy.arnnect.comment.repository.CommentRepository;
import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.comment.domain.entity.TargetType;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.repository.MemberRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentServiceImpl implements CommentService{

    private final CommentRepository repository;
    private final MemberRepository memberRepository;
    private final MemberService memberService;

    @Override
    @Transactional
    public void createComment(CreateCommentRequest request, String memberUuid) {
        Long memberId = memberService.getMemberId(memberUuid);
        Comment comment = request.toEnity(memberId);
        repository.save(comment);
    }

    @Override
    @Transactional
    public void updateComment(UpdateCommentRequest request, Long reviewId ,String memberUuid) {
        Long memberId = memberService.getMemberId(memberUuid);
        Comment comment = repository.findByCommentIdAndMemberId(reviewId, memberId).orElseThrow(
                () -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));
        String originContent = comment.getContent();
        try {
            comment.updateComment(request);
            repository.save(comment);
        } catch (Exception e){
            comment.setContent(originContent);
        }
    }

    @Override
    public void deleteComment(String memberUuid, Long commentId) {
        Long memberId = memberService.getMemberId(memberUuid);
        Comment comment = repository.findByCommentIdAndMemberId(commentId, memberId).orElseThrow(
                () -> new BusinessException(ErrorCode.REVIEW_NOT_FOUND));
        comment.deleteComment();
        repository.save(comment);
    }

    @Override
    public List<CommentResponse> getCommentListOfArtwork(Integer artworkId) {
        List<Comment> comments = repository.findByTargetTypeAndTargetIdAndIsDeletedFalseOrderByCommentIdAsc(
                TargetType.ARTWORK, artworkId);
        log.info(comments.toString());
        return comments.stream().map(comment -> {
            String nickName = memberRepository.findById(comment.getMemberId())
                    .map(Member::getNickname)
                    .orElse("알 수 없음");
            return CommentResponse.from(comment, nickName);
        }).toList();
    }

    @Override
    public Integer getCommentCount(TargetType targetType, Integer targetId) {
        if(targetType == TargetType.ARTWORK) {
            return (int) repository.countByTargetTypeAndTargetIdAndIsDeletedFalse(TargetType.ARTWORK, targetId);
        } else {
            return (int) repository.countByTargetTypeAndTargetIdAndIsDeletedFalse(TargetType.REVIEW, targetId);
        }
    }
}
