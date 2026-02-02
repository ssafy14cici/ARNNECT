package com.ssafy.arnnect.member.domain.entity;
import com.ssafy.arnnect.member.application.dto.request.UpdateMemberRequest;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "member")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@ToString
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // ✅ 추가
    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "member_uuid", nullable = false, length = 36)
    private String memberUuid;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "birth", nullable = false)
    private LocalDate birth;

    @Column(name = "nickname", nullable = false, length = 50)
    private String nickname;

    @Column(name = "origin_profile_image_name", length = 255) // 원본 이미지 이름
    private String originProfileImageName;

    @Column(name = "saved_profile_image_name", length = 255) // 저장 이미지 이름
    private String savedProfileImageName;

    // tinyint(1) -> Boolean 매핑
    @Column(name = "is_agree", nullable = false)
    private Boolean isAgree;  // MySQL에서는 tinyint(1)로 매핑됨 [web:1][web:2]

    @Column(name = "is_deleted")
    private Boolean isDeleted; // nullable 허용 [web:1][web:2]

    @Column(name = "created_at",
            insertable = false,
            updatable = false)
    private LocalDateTime createdAt; // DEFAULT CURRENT_TIMESTAMP [web:1]

    @Column(name = "updated_at",
            insertable = false,
            updatable = false)
    private LocalDateTime updatedAt; // DEFAULT CURRENT_TIMESTAMP ON UPDATE [web:1]

    @Enumerated(EnumType.STRING) // MySQL ENUM <-> Java enum 매핑 [web:6][web:9]
    @Column(name = "role", nullable = false, columnDefinition = "ENUM('GENERAL','ARTIST')")
    private UserRole role= UserRole.GENERAL;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void encodePassword(String encoded){
        this.password = encoded;
    }

    public void updateNickname(String nickname){
        if (nickname != null && !nickname.trim().isEmpty()) {
            this.nickname = nickname;
        }
    }

    public void updateProfileImage(Map<String, String> profileImageName){
        this.savedProfileImageName = profileImageName.get("saved");
        this.originProfileImageName = profileImageName.get("origin");
    }

    public void deleteMember(){
        this.isDeleted = true;
    }
}
