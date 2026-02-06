package com.ssafy.arnnect.preference.application.service;

import com.ssafy.arnnect.artwork.application.service.ArtworkService;
import com.ssafy.arnnect.preference.application.dto.request.ResultArtworkIdRequest;
import com.ssafy.arnnect.preference.application.dto.response.ArtworkResponse;
import com.ssafy.arnnect.preference.application.dto.response.GenreWithArtworksResponse;
import com.ssafy.arnnect.preference.application.dto.response.ResultMBTIResponse;
import com.ssafy.arnnect.preference.application.vo.AxisScore;
import com.ssafy.arnnect.preference.application.vo.GenreMbtiWeight;
import com.ssafy.arnnect.preference.domain.MbtiType;
import com.ssafy.arnnect.preference.domain.MemberMbti;
import com.ssafy.arnnect.preference.repository.MemberMbtiRepository;
import com.ssafy.arnnect.preference.repository.PreferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class PreferenceService {

    private final PreferenceRepository repository;
    private final MemberMbtiRepository mbtiRepository;
    private final ArtworkService artworkService;

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
            genreResp.getArtworks().add(artwork);
        }

        return new ArrayList<>(genreMap.values());
    }

    @Transactional
    public String saveMBTIResult(String memberUuid, ResultArtworkIdRequest request){
        List<Long> genreIds = artworkService.findGenreIdsByArtworkIds(request.getArtworkIdList());
        String type = calculate(genreIds);
        if(memberUuid == null) return type;
        mbtiRepository.save(MemberMbti.builder()
                        .memberUuid(memberUuid)
                        .type(type)
                .build());
        return type;
    }

    private String calculate(List<Long> genreIds) {


        AxisScore sum = new AxisScore();

        for (Long genreId : genreIds) {
            AxisScore w = GenreMbtiWeight.MAP.get(genreId);
            if (w != null) sum.add(w);
        }

        StringBuilder result = new StringBuilder();

        result.append(sum.getAr() >= 0 ? "A" : "R");
        result.append(sum.getNm() >= 0 ? "N" : "M");
        result.append(sum.getLc() >= 0 ? "L" : "C");
        result.append(sum.getSe() >= 0 ? "S" : "E");

        return result.toString();
    }
}
