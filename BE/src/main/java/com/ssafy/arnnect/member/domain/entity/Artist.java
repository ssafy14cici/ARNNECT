package com.ssafy.arnnect.member.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Year;

@Entity
@Table(name = "artist")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class Artist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "artist_id")
    private Long artistId;

    @Column(name = "member_id", insertable = false, updatable = false)
    private Long memberId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    @MapsId  // artist_id = member_id 공유 (필요시)
    private Member member;

    @Column(name = "field_id")
    private Integer fieldId;

    @Column(name = "genre_id")
    private Integer genreId;

    @Column(name = "debut_year")
    private Year debutYear;

    @Column(name = "sns_page", length = 500)
    private String snsPage;

    @Column(name = "document", length = 255)
    private String document;

    @Column(name = "affilation", length = 50)
    private String affilation;

    @Column(name = "is_verified")
    private Boolean isVerified;

    @Column(name = "introduction", columnDefinition = "text")
    private String introduction;

    @Column(name = "is_new")
    private Boolean isNew;
}

