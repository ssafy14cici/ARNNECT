package com.ssafy.arnnect.member.application.dto.response;

import com.ssafy.arnnect.member.domain.entity.Artist;
import com.ssafy.arnnect.member.domain.entity.Member;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
@Builder
public class MyInfoResponse {
    private String email;
    private String name;
    private String nickname;
    private LocalDate birth;
    private String phone;
    private Boolean isAgree;

    /** artist **/
    private String document;
    private Integer fieldId;
    private Integer debutYear;
    private Integer genreId;
    private String snsPage;
    private String affiliation;
    private Boolean isVerified;

    private String originalProfileName;
    private String introduction;


    public static MyInfoResponse fromMember(Member member){
        return MyInfoResponse.builder()
                .email(member.getEmail())
                .name(member.getName())
                .nickname(member.getNickname())
                .birth(member.getBirth())
                .phone(member.getPhone())
                .originalProfileName(member.getOriginProfileImageName())
                .build();
    }

    public static MyInfoResponse fromArtist(Artist artist){
        // 아티스트 추가 정보
        return MyInfoResponse.builder()
                .email(artist.getMember().getEmail())
                .name(artist.getMember().getName())
                .nickname(artist.getMember().getNickname())
                .birth(artist.getMember().getBirth())
                .phone(artist.getMember().getPhone())
                .originalProfileName(artist.getMember().getOriginProfileImageName())
                .document(artist.getDocument())
                .fieldId(artist.getFieldId())
                .debutYear(artist.getDebutYear())
                .genreId(artist.getGenreId())
                .snsPage(artist.getSnsPage())
                .affiliation(artist.getAffiliation())
                .isVerified(artist.getIsVerified())
                .introduction(artist.getIntroduction())
                .build();
    }



}
