package com.ssafy.arnnect.remind.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@AllArgsConstructor
@Builder
public class RemindQuizRequest {
    private String model;
    private List<Message> messages;
    private Integer max_tokens;
    private Double temperature;

    @Getter
    @AllArgsConstructor
    public static class Message {  // static으로 선언
        private String role;
        private Object content;
    }

    @Getter
    @AllArgsConstructor
    @Builder
    public static class ReviewPayload { // static으로 선언
        private Long reviewId;
        private String title;
        private String review;
    }
}
