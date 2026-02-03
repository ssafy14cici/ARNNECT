package com.ssafy.arnnect.review.application.dto.request;

import com.ssafy.arnnect.review.domain.entity.Review;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
@Builder
public class CreateReviewRequest {
    Long artworkId;
    String title;
    String content;
    MultipartFile image;
    List<String> tags;


    public Review toEntity(Long memberId){
        return Review.builder()
                .artworkId(this.artworkId)
                .memberId(memberId)
                .title(this.title)
                .content(this.content)
                .savedImageName(null)
                .originImageName(null)
                .isDeleted(false)
                .build();
    }

    public Review toEntity(Long memberId, Map<String,String> imageList){
        return Review.builder()
                .artworkId(this.artworkId)
                .memberId(memberId)
                .title(this.title)
                .content(this.content)
                .savedImageName(imageList.get("saved"))
                .originImageName(imageList.get("origin"))
                .isDeleted(false)
                .build();
    }
}
