package com.ssafy.arnnect.fanletter.application.dto.request;

import com.ssafy.arnnect.fanletter.domain.entity.FanLetter;
import com.ssafy.arnnect.member.domain.entity.Member;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class FanLetterRequest {
    String memberUuid;//작가
    String title;
    String content;
    Long artworkId;

    public FanLetter toEntity(Long artistId, Long memberId){
        return FanLetter.builder()
                .member(Member.builder().memberId(artistId).build())
                .writerId(memberId)
                .title(this.title)
                .content(this.content)
                .artworkId(this.artworkId)
                .build();
    }
}
