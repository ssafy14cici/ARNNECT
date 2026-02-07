package com.ssafy.arnnect.artwork.application.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class AiRecommendResponseDto {

    @JsonProperty("memberId")
    private Long memberId;

    private List<AiRecommendationDto> recommends;
}
