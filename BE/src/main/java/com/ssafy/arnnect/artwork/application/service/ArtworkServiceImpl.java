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
import com.ssafy.arnnect.member.application.service.MemberService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class ArtworkServiceImpl implements ArtworkService{

    private final ArtworkRepository repository;
    private final FieldRepository fieldRepository;
    private final GenreRepository genreRepository;
    private final MemberService memberService;

    @Value("${file.upload-dir}")
    private String uploadDir;
    private String artworkDir = "artwork/";

    @Override
    @Transactional
    public void createArtwork(String memberUuid, CreateArtworkRequest request) {
        Map<String, String> imageName = null;
        try {
            imageName = saveImage(request.getImage());
            Artwork artwork = request.toEntity(memberService.getMemberId(memberUuid), imageName);
            repository.save(artwork);
        }catch (Exception e){
            deleteImage(imageName.get("saved"));
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
                ()-> new BusinessException(ErrorCode.ARTWORK_NOT_DOUND));

        try{
            deleteImage(artwork.getSavedImageName());
            artwork.updateArtwork(request);
            imageName = saveImage(request.getImage());
            artwork.updateImage(imageName);
        }catch (Exception e){
            deleteImage(imageName.get("saved"));
            throw e;
        }

    }

    @Override
    @Transactional
    public void deleteArtwork(String memberUuid, Long artworkId) {
        Long memberId = memberService.getMemberId(memberUuid);
        Artwork artwork = repository.findByArtworkIdAndMemberIdAndIsDeleted(artworkId, memberId, false).orElseThrow(
                ()-> new BusinessException(ErrorCode.ARTWORK_NOT_DOUND));
        deleteImage(artwork.getSavedImageName());
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

    public Map<String,String> saveImage(MultipartFile image) {
        try {
            // 1. 디렉토리 생성
            File uploadFolder = new File(uploadDir);
            if (!uploadFolder.exists()) {
                uploadFolder.mkdirs();
            }

            // 2. 파일명 중복 방지 (UUID + 원본 확장자)
            String originalName = image.getOriginalFilename();
            String fileExtension = getFileExtension(originalName);
            String fileName = UUID.randomUUID() + "." + fileExtension;

            // 3. 저장 경로
            File saveFile = new File(uploadDir + artworkDir + fileName);

            // 4. 저장
            image.transferTo(saveFile);

            log.info("이미지 저장 완료: {}", saveFile.getAbsolutePath());

            return Map.of("origin",originalName,"saved",fileName);

        } catch (IOException e) {
            log.error("이미지 저장 실패: {}", e.getMessage());
            throw new RuntimeException("이미지 저장 실패", e);
        }
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return "";
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }

    private void deleteImage(String imageName){
        File file = new File(uploadDir+artworkDir+imageName);
        if (file.exists()) {
            file.delete();
            log.info("롤백: {} 삭제", imageName);
        }
    }
}
