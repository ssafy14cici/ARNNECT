package com.ssafy.arnnect.artwork.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;


import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "art_genre")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ArtGenre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "genre_id", nullable = false)
    private Integer genreId;

    @Column(name = "name", length = 30, nullable = false)
    private String name;

    @Column(name = "e_name", length = 30, nullable = false)
    private String eName;  // 영문명

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private ArtField field;
}

