package com.ssafy.arnnect.preference.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name="member_mbti")
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class MemberMbti {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;
    String memberUuid;
    String type;
    @CreatedDate
    LocalDateTime createdAt;
}
