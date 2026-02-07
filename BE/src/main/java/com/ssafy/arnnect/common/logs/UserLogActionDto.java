package com.ssafy.arnnect.common.logs;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserLogActionDto {
    private Long artworkId;
    private String action;

    public static UserLogActionDto from(UserActionLog entity){
        return new UserLogActionDto(entity.getArtworkId(), entity.getAction().toString());
    }
}
