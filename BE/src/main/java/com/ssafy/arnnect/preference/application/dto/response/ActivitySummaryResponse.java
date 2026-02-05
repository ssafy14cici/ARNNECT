package com.ssafy.arnnect.preference.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ActivitySummaryResponse {
    Long favorite_cnt;
    Long comment_cnt;
    Long ticket_cnt;
}
