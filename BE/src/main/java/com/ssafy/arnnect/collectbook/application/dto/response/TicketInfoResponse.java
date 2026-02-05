package com.ssafy.arnnect.collectbook.application.dto.response;

import com.ssafy.arnnect.collectbook.domain.entity.TicketInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@AllArgsConstructor
@Builder
public class TicketInfoResponse {
    Long ticketId;
    String ticketCode;
    String title;
    String address;
    String addressDetail;
    LocalDate startDate;
    LocalDate endDate;
    LocalTime startTime;
    LocalTime endTime;
    String qrImageName;
    String ticketImageName;

    public static TicketInfoResponse from(TicketInfo entity){
        return TicketInfoResponse.builder()
                .ticketId(entity.getTicketId())
                .ticketCode(entity.getTicketCode())
                .title(entity.getTitle())
                .address(entity.getAddress())
                .addressDetail(entity.getAddressDetail())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .qrImageName("/qrcode/"+entity.getQrImageName())
                .ticketImageName("/ticket/"+entity.getTicketImageName())
                .build();
    }
}
