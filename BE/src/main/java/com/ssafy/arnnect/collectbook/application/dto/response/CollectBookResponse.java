package com.ssafy.arnnect.collectbook.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CollectBookResponse {
    private String artistUuid;
    private String ticketCode;
    private Long collectRank;
    private String title;
    private String address;
    private String addressDetail;
    private Date startDate;
    private Date endDate;
    private Time startTime;
    private Time endTime;
    private Timestamp createdAt;
    private String qrImageUrl;
    private String ticketImageUrl;
}
