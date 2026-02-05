package com.ssafy.arnnect.preference.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AnalysisListResponse {
    List<CommonResponse> topGenres;
    List<CommonResponse> topTags;
    List<CommonResponse> topArtists;
    ActivitySummaryResponse activitySummary;
}
