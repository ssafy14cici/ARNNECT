package com.ssafy.arnnect.member.application.service;

import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.application.dto.response.MemberInfoResponse;
import com.ssafy.arnnect.member.application.dto.response.MyInfoResponse;
import com.ssafy.arnnect.member.domain.entity.UserRole;

public interface MemberService {
    void createMember(CreateMemberRequest request);
    void createArtist(CreateArtistRequest request);
    void updateMember();
    void updateArtist();
    void deleteMember(String memberUuid);
    MyInfoResponse getMyInfo(String memberUuid, UserRole role);
    MemberInfoResponse getMemberInfo(String myUuid, String memberUuid);
    Long getMemberId(String memberUuid);
}
