package com.ssafy.arnnect.member.application.service;

import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateMemberRequest;
import com.ssafy.arnnect.member.application.dto.response.MemberInfoResponse;
import com.ssafy.arnnect.member.domain.entity.MemberInfo;
import com.ssafy.arnnect.member.application.dto.response.MyInfoResponse;
import com.ssafy.arnnect.member.domain.entity.UserRole;

import java.io.IOException;

public interface MemberService {
    void createMember(CreateMemberRequest request) throws IOException;
    void createArtist(CreateArtistRequest request) throws IOException;
    void updateMember(UpdateMemberRequest request, String memberUuid) throws IOException;
    void updateArtist(UpdateArtistRequest request, String memberUuid) throws IOException;
    void deleteMember(String memberUuid) throws IOException;
    MyInfoResponse getMyInfo(String memberUuid, UserRole role);
    MemberInfoResponse getMemberInfo(String myUuid, String memberUuid);
    Long getMemberId(String memberUuid);
}
