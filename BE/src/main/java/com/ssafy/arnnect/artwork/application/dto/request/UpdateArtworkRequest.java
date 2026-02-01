package com.ssafy.arnnect.artwork.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
@Getter
@AllArgsConstructor
@Builder
public class UpdateArtworkRequest {
    String title;
    String description;
    Integer fieldId;
    Integer genreId;
    LocalDate productionDate;
    String size;
    MultipartFile image;
    List<String> tags;
}
