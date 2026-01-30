package com.ssafy.arnnect.remind.application.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class RemindQuizResponse {
    @JsonProperty("reviewId")
    private Long reviewId;

    @JsonProperty("quiz")
    private String quiz;
}
