package com.ssafy.arnnect.auth.application.service;

import com.ssafy.arnnect.auth.application.dto.request.LoginRequest;

public interface AuthService {
    String login(LoginRequest request);
}
