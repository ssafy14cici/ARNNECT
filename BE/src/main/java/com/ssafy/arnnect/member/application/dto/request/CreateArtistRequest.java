package com.ssafy.arnnect.member.application.dto.request;

import com.ssafy.arnnect.member.domain.entity.Artist;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.time.Year;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateArtistRequest {

    // ===== MEMBER 기본 정보 =====
    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 50)
    private String name;

    @NotBlank(message = "이메일은 필수입니다.")
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, max = 255)
    private String password;

    @NotBlank(message = "전화번호는 필수입니다.")
    @Pattern(regexp = "^01(?:0|1|[6-9])(?:\\d{3}|\\d{4})\\d{4}$")
    @Size(max = 20)
    private String phone;

    @NotNull(message = "생년월일은 필수입니다.")
    @Past
    private LocalDate birth;

    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(max = 50)
    private String nickname;

    @NotNull(message = "약관 동의는 필수입니다.")
    private Boolean isAgree;

    private String profileImage;

    // ===== ARTIST 추가 정보 (아티스트 전용) =====
    @Min(value = 1, message = "분야 ID는 1 이상이어야 합니다.")
    private Integer fieldId;  // art_field.field_id FK

    @Min(value = 1, message = "장르 ID는 1 이상이어야 합니다.")
    private Integer genreId;  // art_genre.genre_id FK

    @Min(value = 1900, message = "데뷔 연도는 1900년 이후여야 합니다.")
    @Max(value = 2100)
    private Year debutYear;  // year 타입

    @Size(max = 500)
    private String snsPage;

    @Size(max = 255)
    private String document;

    @Size(max = 50)
    private String affiliation;

    private Boolean isNew;  // 신인 여부

    @Size(max = 1000, message = "소개글은 1000자 이하로 작성해주세요.")
    private String introduction;

    public Member toMemberEntity(){
        return Member.builder()
                .memberUuid(String.valueOf(UUID.randomUUID()))
                .role(UserRole.ARTIST)
                .name(this.name)
                .email(this.email)
                .password(this.password)
                .phone(this.phone)
                .birth(this.birth)
                .nickname(this.nickname)
                .isAgree(this.isAgree)
                .build();
    }
    public Artist toArtistEntity(Member member){
        return Artist.builder()
                .member(member)
                .fieldId(this.fieldId)
                .genreId(this.genreId)
                .debutYear(this.debutYear)
                .snsPage(this.snsPage)
                .document(this.document)
                .affiliation(this.affiliation)
                .isNew(this.isNew)
                .introduction(this.introduction)
                .build();
    }

}
