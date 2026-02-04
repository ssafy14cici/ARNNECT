package com.ssafy.arnnect.collectbook.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@AllArgsConstructor
@Builder
public class UpdateTicketRequest {
    String title;
    String address;
    String addressDetail;
    LocalDate startDate;
    LocalDate endDate;
    LocalTime startTime;
    LocalTime endTime;
    MultipartFile qrImage;
    MultipartFile ticketImage;
}
