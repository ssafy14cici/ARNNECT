package com.ssafy.arnnect.member.application.dto.response;

import com.ssafy.arnnect.member.domain.entity.MemberInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberInfoResponse {
    String nickname;
    Integer isArtist;

    /** 예술인 **/
    Integer isNew;
    String fieldName;
    String genreName;
    Integer debutYear;
    String snsPage;
    String imgUrl;
    String introduction;
    String affiliation;

    Long followers;
    Long followings;
    Long isFollowing;

    public static MemberInfoResponse from(MemberInfo info, String imgUrl){
        return MemberInfoResponse.builder()
                .nickname(info.getNickname())
                .isArtist(info.getIsArtist())

                // 예술인 정보
                .isNew(info.getIsNew())
                .fieldName(info.getFieldName())
                .genreName(info.getGenreName())
                .debutYear(info.getDebutYear())
                .snsPage(info.getSnsPage())
                .imgUrl(imgUrl+info.getSaved_profile_name())  // 기본 URL + 파일명
                .introduction(info.getIntroduction())
                .affiliation(info.getAffiliation())

                // 팔로워 정보
                .followers(info.getFollowers())
                .followings(info.getFollowings())
                .isFollowing(info.getIsFollowing())
                .build();
    }
}
