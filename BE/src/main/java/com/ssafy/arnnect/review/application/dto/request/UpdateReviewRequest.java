package com.ssafy.arnnect.review.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@AllArgsConstructor
@Builder
public class UpdateReviewRequest {
    Long artworkId;
    String title;
    String content;
    MultipartFile image;
    List<String> tags;
}
