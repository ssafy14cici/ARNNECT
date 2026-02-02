package com.ssafy.arnnect.artwork.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank
    String title;
    @NotBlank
    String description;
    @NotNull
    Integer fieldId;
    Integer genreId;
    @NotNull
    LocalDate productionDate;
    @NotNull
    String size;
    MultipartFile image;
    List<String> tags;
}
