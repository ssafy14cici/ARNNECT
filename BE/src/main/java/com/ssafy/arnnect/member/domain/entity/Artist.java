package com.ssafy.arnnect.member.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "artist")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class Artist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "artist_id")
    private Long artistId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    @MapsId  // artist_id = member_id 공유 (필요시)
    private Member member;

    @Column(name = "field_id")
    private Integer fieldId;

    @Column(name = "genre_id")
    private Integer genreId;

    @Column(name = "debut_year")
    private Integer debutYear;

    @Column(name = "sns_page", length = 500)
    private String snsPage;

    @Column(name = "document", length = 255)
    private String document;

    @Column(name = "affiliation", length = 50)
    private String affiliation;

    @Column(name = "is_verified")
    private Boolean isVerified;

    @Column(name = "introduction", columnDefinition = "text")
    private String introduction;

    @Column(name = "is_new")
    private Boolean isNew;

}

