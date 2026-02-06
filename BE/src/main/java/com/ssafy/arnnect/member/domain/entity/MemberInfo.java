package com.ssafy.arnnect.member.domain.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class MemberInfo {
    String nickname;
    Integer isArtist;

    /** 예술인 **/
    Boolean isNew;
    String fieldName;
    String genreName;
    Integer debutYear;
    String snsPage;
    String originProfileName;
    String savedProfileName;
    String introduction;
    String affiliation;

    Long followers;
    Long followings;
    Long isFollowing;
}
