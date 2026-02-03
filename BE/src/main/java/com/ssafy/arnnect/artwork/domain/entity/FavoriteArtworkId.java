package com.ssafy.arnnect.artwork.domain.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class FavoriteArtworkId implements Serializable {
    private Long member;
    private Long artwork;
}