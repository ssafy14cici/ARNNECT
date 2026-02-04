package com.ssafy.arnnect.artwork.application.service;

import com.ssafy.arnnect.artwork.application.dto.request.CreateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.request.UpdateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.response.*;
import com.ssafy.arnnect.artwork.domain.entity.ArtworkDetail;

import java.util.List;

public interface ArtworkService {
    void createArtwork(String memberUuid, CreateArtworkRequest request);
    void updateArtwork(String memberUuid, Long artworkId, UpdateArtworkRequest request);
    void deleteArtwork(String memberUuid, Long artworkId);

    ArtworkDetailResponse getDetailArtwork(String memberUuid, Long artworkId);
    List<ArtworkResponse> getArtworkList();
    List<ArtworkResponse> getArtworkListOfArtist(String memberUuid);
    List<NewArtistRepresentativeResponse> getNewArtist();

    List<FieldResponse> getFeildList();
    List<GenreResponse> getGenreList(Integer fieldId);

    Boolean toggleFavorite(String memberUuid, Long artworkId);
}
