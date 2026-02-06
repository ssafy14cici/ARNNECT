package com.ssafy.arnnect.artwork.application.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class AiWrapperRequestDto {

    @JsonProperty("inputData")
    private AiInputDataDto inputData;
}
