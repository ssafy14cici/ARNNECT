package com.ssafy.arnnect.artwork.application.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

import java.util.List;

@Getter
@AllArgsConstructor
@ToString
public class AiInputDataDto {

    @JsonProperty("memberId")
    private String memberId;

    @JsonProperty("logs")
    private List<AiActionDto> logs;

}
