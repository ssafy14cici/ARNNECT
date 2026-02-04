package com.ssafy.arnnect.collectbook.application.dto.request;

import com.ssafy.arnnect.collectbook.domain.entity.TicketInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@AllArgsConstructor
@Builder
public class CreateTicketRequest {
    String ticketCode;
    String title;
    String address;
    String addressDetail;
    LocalDate startDate;
    LocalDate endDate;
    LocalTime startTime;
    LocalTime endTime;
    MultipartFile qrImage;
    MultipartFile ticketImage;

    public TicketInfo toEntity(Long memberId, String qrImageName, String ticketImageName) {
        return TicketInfo.builder()
                .memberId(memberId)
                .address(this.address)
                .addressDetail(this.addressDetail)
                .title(this.title)
                .startDate(this.startDate)  // java.util.Date → LocalDate 변환
                .endDate(this.endDate)
                .startTime(this.startTime)
                .endTime(this.endTime)
                .ticketCode(this.ticketCode)
                .qrImageName(qrImageName)
                .ticketImageName(ticketImageName)
                .isDeleted(false)
                .build();
    }
}
