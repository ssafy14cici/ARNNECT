package com.ssafy.arnnect.member.application.dto.request;

import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMemberRequest {

    @NotBlank(message = "이름은 필수 입력 항목입니다.")
    @Size(min = 1, max = 50, message = "이름은 50자 이하로 입력해주세요.")
    private String name;

    @NotBlank(message = "이메일은 필수 입력 항목입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @Size(max = 100, message = "이메일은 100자 이하로 입력해주세요.")
    private String email;

    @NotBlank(message = "비밀번호는 필수 입력 항목입니다.")
    @Size(min = 8, max = 255, message = "비밀번호는 8자 이상 255자 이하로 입력해주세요.")
    private String password;

    @NotBlank(message = "전화번호는 필수 입력 항목입니다.")
    @Pattern(regexp = "^01(?:0|1|[6-9])(?:\\d{3}|\\d{4})\\d{4}$",
            message = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)")
    @Size(max = 20, message = "전화번호는 20자 이하로 입력해주세요.")
    private String phone;

    @NotNull(message = "생년월일은 필수 입력 항목입니다.")
    @Past(message = "생년월일은 오늘 이전 날짜여야 합니다.")
    private java.time.LocalDate birth;

    @NotBlank(message = "닉네임은 필수 입력 항목입니다.")
    @Size(min = 1, max = 50, message = "닉네임은 50자 이하로 입력해주세요.")
    private String nickname;

    @NotNull(message = "이용약관 동의 여부는 필수 입력 항목입니다.")
    private Boolean isAgree;

    public Member toMemberEntity(){
        return Member.builder()
                .memberUuid(String.valueOf(UUID.randomUUID()))
                .role(UserRole.GENERAL)
                .name(this.name)
                .email(this.email)
                .password(this.password)
                .phone(this.phone)
                .birth(this.birth)
                .nickname(this.nickname)
                .isAgree(this.isAgree)
                .build();
    }

}

