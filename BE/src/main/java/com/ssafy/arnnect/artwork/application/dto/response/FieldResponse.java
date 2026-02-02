package com.ssafy.arnnect.artwork.application.dto.response;

import com.ssafy.arnnect.artwork.domain.entity.ArtField;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class FieldResponse {
    Integer fieldId;
    String fieldName;

    public static FieldResponse from(ArtField entity){
        return FieldResponse.builder()
                .fieldId(entity.getFieldId())
                .fieldName(entity.getName())
                .build();
    }
}
