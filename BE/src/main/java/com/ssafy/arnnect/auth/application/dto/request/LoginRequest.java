package com.ssafy.arnnect.auth.application.dto.request;

import lombok.*;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ToString
public class LoginRequest {
    private String email;
    private String password;
}
