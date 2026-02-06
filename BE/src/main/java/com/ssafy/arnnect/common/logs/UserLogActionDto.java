package com.ssafy.arnnect.common.logs;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserLogActionDto {
    /**todo : Long으로 변경해야해**/
    private String artworkId; // category061_0001
    private String action;    // VIEW, STAY

    public static UserLogActionDto from(UserActionLog entity){
        return new UserLogActionDto(entity.getArtworkId().toString(), entity.getAction().toString());
    }
}
