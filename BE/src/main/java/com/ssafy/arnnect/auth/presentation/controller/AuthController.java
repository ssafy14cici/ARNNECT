package com.ssafy.arnnect.auth.presentation.controller;

import com.ssafy.arnnect.auth.application.dto.request.LoginRequest;
import com.ssafy.arnnect.auth.application.dto.response.AccessTokenResponse;
import com.ssafy.arnnect.auth.application.dto.response.TokenPair;
import com.ssafy.arnnect.auth.application.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService service;
    @PostMapping("/login")
    public ResponseEntity<AccessTokenResponse> postLogin(@RequestBody LoginRequest request, HttpServletResponse response){
        TokenPair tokenPair = service.login(request);

        Cookie cookie = new Cookie("refreshToken", tokenPair.getRefreshToken());
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 24 * 14); // 예: 14일
        response.addCookie(cookie);

        return ResponseEntity.ok(new AccessTokenResponse(tokenPair.getAccessToken()));
    }

    @GetMapping("/email/verify")
    public ResponseEntity<Boolean> getEmailVerify(@RequestParam String email){
        return ResponseEntity.ok(service.emailVerify(email));
    }

}
