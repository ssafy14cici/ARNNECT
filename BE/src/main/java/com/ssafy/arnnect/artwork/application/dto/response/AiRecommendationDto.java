package com.ssafy.arnnect.artwork.application.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendationDto {

    private int rank;

    /**todo : Long으로 변경해야해**/
    @JsonProperty("artworkId")
    private String artworkId;

}
