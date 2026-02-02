package com.ssafy.arnnect.member.domain.entity;

import com.ssafy.arnnect.member.application.dto.request.UpdateArtistRequest;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "artist")
@Getter
@Setter
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

    public void updateArtist(UpdateArtistRequest request){
        if (request.getFieldId() != null) {
            this.fieldId = request.getFieldId();
        }
        if (request.getGenreId() != null) {
            this.genreId = request.getGenreId();
        }
        if (request.getDebutYear() != null) {
            this.debutYear = request.getDebutYear();
        }
        if (request.getAffiliation() != null && !request.getAffiliation().trim().isEmpty()) {
            this.affiliation = request.getAffiliation();
        }
        if (request.getSnsPage() != null && !request.getSnsPage().trim().isEmpty()) {
            this.snsPage = request.getSnsPage();
        }
        if (request.getIntroduction() != null && !request.getIntroduction().trim().isEmpty()) {
            this.introduction = request.getIntroduction();
        }
    }
}

