package com.ssafy.arnnect.artwork.application.service;

import com.ssafy.arnnect.artwork.application.dto.request.CreateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.request.UpdateArtworkRequest;
import com.ssafy.arnnect.artwork.application.dto.response.ArtworkDetailResponse;
import com.ssafy.arnnect.artwork.application.dto.response.ArtworkResponse;
import com.ssafy.arnnect.artwork.domain.entity.ArtworkDetail;
import com.ssafy.arnnect.artwork.application.dto.response.FieldResponse;
import com.ssafy.arnnect.artwork.application.dto.response.GenreResponse;
import com.ssafy.arnnect.artwork.domain.entity.Artwork;
import com.ssafy.arnnect.artwork.domain.entity.ArtworkTag;
import com.ssafy.arnnect.artwork.domain.entity.Tag;
import com.ssafy.arnnect.artwork.repository.*;
import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.common.file.FileStorageService;
import com.ssafy.arnnect.common.file.FileType;
import com.ssafy.arnnect.member.application.service.MemberService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ArtworkServiceImpl implements ArtworkService{

    private final ArtworkRepository repository;
    private final FieldRepository fieldRepository;
    private final GenreRepository genreRepository;
    private final TagRepository tagRepository;
    private final ArtworkTagRepository artworkTagRepository;
    private final MemberService memberService;
    private final FileStorageService fileService;

    @Override
    @Transactional
    public void createArtwork(String memberUuid, CreateArtworkRequest request) {
        Map<String, String> imageName = null;
        try {
            imageName = fileService.saveFile(request.getImage(), FileType.ARTWORK);
            Artwork artwork = request.toEntity(memberService.getMemberId(memberUuid), imageName);

            createTag(request.getTags(), repository.save(artwork).getArtworkId());


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

            artworkTagRepository.deleteByArtworkId(artworkId);
            createTag(request.getTags(), artworkId);

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
    public ArtworkDetailResponse getDetailArtwork(Long artworkId) {
        List<Tag> tags = artworkTagRepository.getByArtworkId(artworkId);
        return ArtworkDetailResponse.from(repository.findByDetailArtwork(artworkId).orElseThrow(
                ()-> new BusinessException(ErrorCode.ARTWORK_NOT_FOUND)), tags, fileService.getBaseDir(FileType.ARTWORK));
    }

    @Override
    public List<ArtworkResponse> getArtworkList() {
        List<ArtworkResponse> response = repository.findAllOrderDesc();
        response.forEach(r -> r.updateUrl(fileService.getBaseDir(FileType.ARTWORK)));
        return response;
    }

    @Override
    public List<ArtworkResponse> getArtworkListOfArtist(String memberUuid) {
        List<ArtworkResponse> response = repository.findArtworkByArtist(memberUuid);
        response.forEach(r -> r.updateUrl(fileService.getBaseDir(FileType.ARTWORK)));
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

    private void createTag(List<String> tagNameList, Long artworkId){
        /**
         * 태그
         */
        //존재하는 태그
        List<Tag> existingTags = tagRepository.findAllByNameIn(tagNameList);
        Set<String> existingNames = existingTags.stream()
                .map(Tag::getName)
                .collect(Collectors.toSet());

        //새로운 태그 등록
        List<Tag> newTags = tagRepository.saveAll(tagNameList.stream()
                .filter(name -> !existingNames.contains(name))  // 기존 제외
                .map(name -> Tag.builder().name(name).build())
                .toList());

        // ArtworkTag 리스트 생성
        List<ArtworkTag> allArtworkTags = new ArrayList<>();

        // 기존 태그 → ArtworkTag 변환
        existingTags.forEach(tag ->
                allArtworkTags.add(ArtworkTag.builder()
                        .artwork(Artwork.builder().artworkId(artworkId).build())
                        .tag(Tag.builder().tagId(tag.getTagId()).build())
                        .build())
        );

        // 신규 태그 추가
        newTags.forEach(tag ->
                allArtworkTags.add(ArtworkTag.builder()
                        .artwork(Artwork.builder().artworkId(artworkId).build())
                        .tag(Tag.builder().tagId(tag.getTagId()).build())
                        .build())
        );

        artworkTagRepository.saveAll(allArtworkTags);
    }
}
