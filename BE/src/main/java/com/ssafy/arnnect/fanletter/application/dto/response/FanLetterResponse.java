package com.ssafy.arnnect.fanletter.application.dto.response;

import com.ssafy.arnnect.fanletter.domain.entity.FanLetter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.sql.Timestamp;

@Getter
@AllArgsConstructor
@Builder
public class FanLetterResponse {
    Long fanLetterId;
    Long artworkId;
    String artworkName;
    String nickname;
    String title;
    String content;
    Timestamp createdAt;
    String answer;

}
