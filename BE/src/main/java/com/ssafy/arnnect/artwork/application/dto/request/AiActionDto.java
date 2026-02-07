package com.ssafy.arnnect.artwork.application.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class AiActionDto {

    @JsonProperty("artworkId")
    private Long artworkId;

    // VIEW / STAY / LIKE 등
    @JsonProperty("action")
    private String action;

}
