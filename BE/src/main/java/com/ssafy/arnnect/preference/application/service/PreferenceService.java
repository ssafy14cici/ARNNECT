package com.ssafy.arnnect.preference.application.service;

import com.ssafy.arnnect.preference.application.dto.response.ArtworkResponse;
import com.ssafy.arnnect.preference.application.dto.response.GenreWithArtworksResponse;
import com.ssafy.arnnect.preference.repository.PreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PreferenceService {

    private final PreferenceRepository repository;

    public List<GenreWithArtworksResponse> getRandomRecommendations() {
        List<Long> randomGenreIds = repository.findRandomGenreIds();
        List<Object[]> results = repository.findRandomGenresWithArtworks(randomGenreIds);

        Map<Long, GenreWithArtworksResponse> genreMap = new LinkedHashMap<>();

        for (Object[] row : results) {
            // Integer 안전 캐스팅 → Long 변환
            Number genreIdNum = (Number) row[0];  // genre_id (int)
            Long genreId = genreIdNum.longValue();

            String genreName = (String) row[1];

            GenreWithArtworksResponse genreResp = genreMap.computeIfAbsent(genreId,
                    k -> new GenreWithArtworksResponse(genreId, genreName, new ArrayList<>()));

            Number artworkIdNum = (Number) row[2];  // artwork_id (bigint)
            Long artworkId = artworkIdNum.longValue();

            String imageUrl = (String) row[3];
            String tagsStr = (String) row[4];
            Set<String> tags = tagsStr != null && !tagsStr.isEmpty()
                    ? Set.of(tagsStr.split(",")) : Set.of();

            ArtworkResponse artwork = new ArtworkResponse(artworkId, imageUrl, tags);
            System.out.println("art : "+artwork.toString());
            genreResp.getArtworks().add(artwork);
        }

        return new ArrayList<>(genreMap.values());
    }

}
