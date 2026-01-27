package com.ssafy.arnnect.auth.presentation.controller;

import com.ssafy.arnnect.auth.application.dto.request.LoginRequest;
import com.ssafy.arnnect.auth.application.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService service;
    @PostMapping("/login")
    public ResponseEntity<Void> postLogin(@RequestBody LoginRequest request){
        service.login(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/email/verify")
    public ResponseEntity<Void> getEmailVerify(){
        return ResponseEntity.ok().build();
    }
}
