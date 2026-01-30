package com.ssafy.arnnect.auth.application.service;

import com.ssafy.arnnect.auth.application.dto.request.LoginRequest;
import com.ssafy.arnnect.auth.application.dto.response.TokenPair;

public interface AuthService {
    TokenPair login(LoginRequest request);
    boolean emailVerify(String email);
}
