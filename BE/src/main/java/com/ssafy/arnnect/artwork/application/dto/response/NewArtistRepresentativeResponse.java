package com.ssafy.arnnect.artwork.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.sql.Date;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class NewArtistRepresentativeResponse {
    private String memberUuid;
    private Long artworkId;
    private String title;
    private String description;
    private Date productionDate;
    private String savedImageName;
}
