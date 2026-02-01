package com.ssafy.arnnect.artwork.application.dto.request;

import com.ssafy.arnnect.artwork.domain.entity.ArtField;
import com.ssafy.arnnect.artwork.domain.entity.ArtGenre;
import com.ssafy.arnnect.artwork.domain.entity.Artwork;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
@Builder
public class CreateArtworkRequest {
    String title;
    String description;
    Integer fieldId;
    Integer genreId;
    LocalDate productionDate;
    String size;
    MultipartFile image;
    List<String> tags;

    public Artwork toEntity(Long memberId, Map<String,String> imageName){
        return Artwork.builder()
                .memberId(memberId)
                .title(this.title)
                .description(this.description)
                .field(ArtField.builder().fieldId(this.fieldId).build())
                .genre(ArtGenre.builder().genreId(this.genreId).build())
                .productionDate(this.productionDate)
                .size(this.size)
                .originImageName(imageName.get("origin"))
                .savedImageName(imageName.get("saved"))
                .build();
    }
}
