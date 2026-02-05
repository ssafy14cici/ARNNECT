package com.ssafy.arnnect.preference.application.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class GenreWithArtworksResponse {
    private Long genreId;
    private String genreName;
    private List<ArtworkResponse> artworks;
    
    public GenreWithArtworksResponse(Long genreId, String genreName, List<ArtworkResponse> artworks) {
        this.genreId = genreId;
        this.genreName = genreName;
        this.artworks = artworks;
    }
}
