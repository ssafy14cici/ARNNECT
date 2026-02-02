package com.ssafy.arnnect.artwork.application.service;

import com.ssafy.arnnect.artwork.application.dto.request.CreateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.request.UpdateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.response.ArtworkResponse;
import com.ssafy.arnnect.artwork.application.dto.response.DetailArtworkResponse;
import com.ssafy.arnnect.artwork.application.dto.response.FieldResponse;
import com.ssafy.arnnect.artwork.application.dto.response.GenreResponse;
import com.ssafy.arnnect.artwork.domain.entity.Artwork;
import com.ssafy.arnnect.artwork.repository.ArtworkRepository;
import com.ssafy.arnnect.artwork.repository.FieldRepository;
import com.ssafy.arnnect.artwork.repository.GenreRepository;
import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.common.file.FileStorageService;
import com.ssafy.arnnect.common.file.FileType;
import com.ssafy.arnnect.member.application.service.MemberService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class ArtworkServiceImpl implements ArtworkService{

    private final ArtworkRepository repository;
    private final FieldRepository fieldRepository;
    private final GenreRepository genreRepository;
    private final MemberService memberService;
    private final FileStorageService fileService;

    @Value("${file.base-dir}")
    private String uploadDir;
    private String artworkDir = "artwork/";

    @Override
    @Transactional
    public void createArtwork(String memberUuid, CreateArtworkRequest request) {
        Map<String, String> imageName = null;
        try {
            imageName = fileService.saveFile(request.getImage(), FileType.ARTWORK);
            Artwork artwork = request.toEntity(memberService.getMemberId(memberUuid), imageName);
            repository.save(artwork);
        }catch (Exception e){
            fileService.deleteFile(imageName.get("saved"), FileType.ARTWORK);
            throw e;
        }

    }

    @Override
    @Transactional
    public void updateArtwork(String memberUuid, Long artworkId, UpdateArtworkRequest request) {
        Map<String, String> imageName = null;
        Long memberId = memberService.getMemberId(memberUuid);
        log.info("member : {}, artwork : {}",memberId, artworkId);
        Artwork artwork = repository.findByArtworkIdAndMemberIdAndIsDeleted(artworkId, memberId, false).orElseThrow(
                ()-> new BusinessException(ErrorCode.ARTWORK_NOT_FOUND));

        try{
            fileService.deleteFile(artwork.getSavedImageName(), FileType.ARTWORK);
            artwork.updateArtwork(request);
            imageName = fileService.saveFile(request.getImage(), FileType.ARTWORK);
            artwork.updateImage(imageName);
        }catch (Exception e){
            fileService.deleteFile(imageName.get("saved"), FileType.ARTWORK);
            throw e;
        }

    }

    @Override
    @Transactional
    public void deleteArtwork(String memberUuid, Long artworkId) {
        Long memberId = memberService.getMemberId(memberUuid);
        Artwork artwork = repository.findByArtworkIdAndMemberIdAndIsDeleted(artworkId, memberId, false).orElseThrow(
                ()-> new BusinessException(ErrorCode.ARTWORK_NOT_FOUND));
        fileService.deleteFile(artwork.getSavedImageName(), FileType.ARTWORK);
        artwork.deleteArtwork();
    }

    @Override
    public DetailArtworkResponse getDetailArtwork(Long artworkId) {
        DetailArtworkResponse response = repository.findByDetailArtwork(artworkId);
        response.updateUrl(uploadDir+artworkDir);
        return response;
    }

    @Override
    public List<ArtworkResponse> getArtworkList() {
        List<ArtworkResponse> response = repository.findAllOrderDesc();
        response.forEach(r -> r.updateUrl(uploadDir + artworkDir));
        return response;
    }

    @Override
    public List<ArtworkResponse> getArtworkListOfArtist(String memberUuid) {
        List<ArtworkResponse> response = repository.findArtworkByArtist(memberUuid);
        response.forEach(r -> r.updateUrl(uploadDir + artworkDir));
        return response;
    }

    @Override
    public List<FieldResponse> getFeildList() {
        return fieldRepository.findAll().stream().map(FieldResponse::from).toList();
    }

    @Override
    public List<GenreResponse> getGenreList(Integer fieldId) {
        return genreRepository.findByField_fieldId(fieldId).stream().map(GenreResponse::from).toList();
    }
}
