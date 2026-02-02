package com.ssafy.arnnect.member.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.web.multipart.MultipartFile;


@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateArtistRequest {
    @Size(min = 8, max = 255)
    private String password;

    @Size(max = 50)
    private String nickname;

    // ===== ARTIST 추가 정보 (아티스트 전용) =====
    @Min(value = 1, message = "분야 ID는 1 이상이어야 합니다.")
    private Integer fieldId;  // art_field.field_id FK

    @Min(value = 1, message = "장르 ID는 1 이상이어야 합니다.")
    private Integer genreId;  // art_genre.genre_id FK

    @Max(value = 2100)
    private Integer debutYear;  // year 타입

    @Size(max = 500)
    private String snsPage;

    @Size(max = 50)
    private String affiliation;

    @Size(max = 1000, message = "소개글은 1000자 이하로 작성해주세요.")
    private String introduction;

    MultipartFile image;
}
