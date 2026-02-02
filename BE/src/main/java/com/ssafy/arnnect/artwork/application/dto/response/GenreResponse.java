package com.ssafy.arnnect.artwork.application.dto.response;

import com.ssafy.arnnect.artwork.domain.entity.ArtField;
import com.ssafy.arnnect.artwork.domain.entity.ArtGenre;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class GenreResponse {
    Integer genreId;
    String genreName;

    public static GenreResponse from(ArtGenre entity){
        return GenreResponse.builder()
                .genreId(entity.getGenreId())
                .genreName(entity.getName())
                .build();
    }
}
