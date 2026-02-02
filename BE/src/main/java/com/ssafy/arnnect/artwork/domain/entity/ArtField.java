package com.ssafy.arnnect.artwork.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "art_field")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ArtField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "field_id", nullable = false)
    private Integer fieldId;

    @Column(name = "name", length = 20, nullable = false)
    private String name;
}
