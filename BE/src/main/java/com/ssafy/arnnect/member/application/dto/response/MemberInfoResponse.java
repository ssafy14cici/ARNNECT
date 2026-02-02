package com.ssafy.arnnect.member.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigInteger;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class MemberInfoResponse {
    String nickname;
    Integer isArtist;

    /** 예술인 **/
    Integer isNew;
    String fieldName;
    String genreName;
    Integer debutYear;
    String snsPage;
    String origin_profile_name;
    String saved_profile_name;
    String introduction;
    String affiliation;

    Long followers;
    Long followings;
    Long isFollowing;
}
