package com.ssafy.arnnect.member.application.service;

import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;

public interface MemberService {
    void createMember(CreateMemberRequest request);
    void createArtist(CreateArtistRequest request);
    int updateMember();
    int updateArtist();
    int deleteMember(String memberUuid);

}
