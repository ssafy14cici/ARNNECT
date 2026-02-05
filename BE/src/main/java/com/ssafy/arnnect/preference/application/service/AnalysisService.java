package com.ssafy.arnnect.preference.application.service;

import com.ssafy.arnnect.preference.application.dto.response.ActivitySummaryResponse;
import com.ssafy.arnnect.preference.application.dto.response.AnalysisListResponse;
import com.ssafy.arnnect.preference.application.dto.response.CommonResponse;
import com.ssafy.arnnect.preference.repository.CommonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final CommonRepository repository;

    public AnalysisListResponse getAnalysisList(String memberUuid){
        //선호 장르 6개
        List<CommonResponse> topGenre = repository.getTopGenre(memberUuid);
        //선호 태그 3개
        List<CommonResponse>  topTag = repository.getTopTag(memberUuid);
        //선호 작가 3명
        List<CommonResponse>  topArtist = repository.getTopArtist(memberUuid);
        //활동 요약
        ActivitySummaryResponse activity = repository.getActivitySummary(memberUuid);

        return AnalysisListResponse.builder()
                .topGenres(topGenre)
                .topTags(topTag)
                .topArtists(topArtist)
                .activitySummary(activity)
                .build();
    }
}
