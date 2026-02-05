package com.ssafy.arnnect.preference.application.dto.response;

import lombok.Data;
import lombok.ToString;

import java.util.Set;

@Data
@ToString
public class ArtworkResponse {
    private Long artworkId;
    private String imageUrl;
    private Set<String> tags;  // Set<String> {"몽환적인", "강렬한"}
    
    public ArtworkResponse(Long artworkId, String imageUrl, Set<String> tags) {
        this.artworkId = artworkId;
        this.imageUrl = imageUrl;
        this.tags = tags;
    }
}
