package com.ssafy.arnnect.member.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRequest {
    @Size(min = 8, max = 255, message = "비밀번호는 8자 이상 255자 이하로 입력해주세요.")
    private String password;

    @Size(min = 1, max = 50, message = "닉네임은 50자 이하로 입력해주세요.")
    private String nickname;
}
