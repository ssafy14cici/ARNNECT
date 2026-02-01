package com.ssafy.arnnect.artwork.application.service;

import com.ssafy.arnnect.artwork.application.dto.request.CreateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.request.UpdateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.response.ArtworkResponse;
import com.ssafy.arnnect.artwork.application.dto.response.DetailArtworkResponse;

import java.util.List;

public interface ArtworkService {
    void createArtwork(String memberUuid, CreateArtworkRequest request);
    void updateArtwork(String memberUuid, Long artworkId, UpdateArtworkRequest request);
    void deleteArtwork(String memberUuid, Long artworkId);

    DetailArtworkResponse getDetailArtwork(Long artworkId);
    List<ArtworkResponse> getArtworkList();
    List<ArtworkResponse> getArtworkListOfArtist(String memberUuid);

}
