package com.ssafy.arnnect.review.application.dto.response;

import com.ssafy.arnnect.remind.application.dto.request.RemindQuizRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReviewQuizResponse {
    private Long reviewId;
    private String title;
    private String review;

    public RemindQuizRequest.ReviewPayload toQuiz(){
        return RemindQuizRequest.ReviewPayload.builder()
                .reviewId(this.reviewId)
                .title(this.title)
                .review(this.review)
                .build();
    }
}
