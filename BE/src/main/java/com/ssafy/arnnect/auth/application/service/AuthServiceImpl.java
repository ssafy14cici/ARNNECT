package com.ssafy.arnnect.auth.application.service;

import com.ssafy.arnnect.auth.application.dto.request.LoginRequest;
import com.ssafy.arnnect.auth.jwt.JwtTokenProvider;
import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final MemberRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public String login(LoginRequest request) {
        Member member = repository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if(!passwordEncoder.matches(request.getPassword(), member.getPassword())){
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        return jwtTokenProvider.createAccessToken(member.getMemberUuid(), member.getRole());
    }
}
