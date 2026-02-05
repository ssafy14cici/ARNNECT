package com.ssafy.arnnect.comment.presentation.controller;

import com.ssafy.arnnect.comment.application.dto.request.CreateCommentRequest;
import com.ssafy.arnnect.comment.application.dto.request.UpdateCommentRequest;
import com.ssafy.arnnect.comment.application.dto.response.CommentResponse;
import com.ssafy.arnnect.comment.application.service.CommentService;
import com.ssafy.arnnect.comment.domain.entity.TargetType;
import com.ssafy.arnnect.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService service;

    @PostMapping()
    public ResponseEntity<Void> createComment(@RequestBody CreateCommentRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createComment(request, memberUuid);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<Void> putComment(@RequestBody UpdateCommentRequest request, @PathVariable Long commentId){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.updateComment(request, commentId, memberUuid);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long commentId){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.deleteComment(memberUuid, commentId);
        return ResponseEntity.ok().build();
    }

    @GetMapping()
    public ResponseEntity<List<CommentResponse>> getComments(@RequestParam Integer targetId, @RequestParam TargetType targetType) {
        return ResponseEntity.ok(service.getCommentList(targetId, targetType));
    }

    @GetMapping("/count")
    public ResponseEntity<Integer> countComments(@RequestParam TargetType target, @RequestParam Integer id) {
        return ResponseEntity.ok(service.getCommentCount(target, id));
    }

    @GetMapping("/my/count")
    public ResponseEntity<Integer> countMyComments() {
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        return ResponseEntity.ok(service.getMyCommentCount(memberUuid));
    }
}
