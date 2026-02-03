package com.ssafy.arnnect.fanletter.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class AnswerRequest {
    String answer;
}
