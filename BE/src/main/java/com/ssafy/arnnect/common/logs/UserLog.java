package com.ssafy.arnnect.common.logs;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_log")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_uuid", nullable = false, length = 36)
    private String memberUuid;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserLogAction action;

    @Column(name = "artwork_id", nullable = false)
    private Long artworkId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private UserLog(String memberUuid, UserLogAction action, Long artworkId) {
        this.memberUuid = memberUuid;
        this.action = action;
        this.artworkId = artworkId;
        this.createdAt = LocalDateTime.now();
    }

    public static UserLog of(String memberUuid, UserLogAction action, Long artworkId) {
        return new UserLog(memberUuid, action, artworkId);
    }
}
