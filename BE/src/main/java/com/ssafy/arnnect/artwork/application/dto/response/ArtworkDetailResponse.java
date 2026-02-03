package com.ssafy.arnnect.artwork.application.dto.response;

import com.ssafy.arnnect.artwork.domain.entity.ArtworkDetail;
import com.ssafy.arnnect.artwork.domain.entity.Tag;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.Date;
import java.util.List;

@Getter
@AllArgsConstructor
@Builder
public class ArtworkDetailResponse {
    Long artworkId;
    String memberUuid;
    String nickname;
    Integer fieldId;
    String fieldName;
    Integer genreId;
    String genreName;
    String title;
    String description;
    Date productionDate;
    String size;
    String imageUrl;
    Long likeCount;
    List<String> tags;

    public static ArtworkDetailResponse from(ArtworkDetail detail, List<Tag> tags, String basicUrl){
        return ArtworkDetailResponse.builder()
                .artworkId(detail.getArtworkId())
                .memberUuid(detail.getMemberUuid())
                .nickname(detail.getNickname())
                .fieldId(detail.getFieldId())
                .fieldName(detail.getFieldName())
                .genreId(detail.getGenreId())
                .genreName(detail.getGenreName())
                .title(detail.getTitle())
                .description(detail.getDescription())
                .productionDate(detail.getProductionDate())
                .size(detail.getSize())
                .imageUrl(basicUrl+detail.getImageUrl())
                .likeCount(detail.getLikeCount())
                .tags(tags.stream().map(Tag::getName).toList())
                .build();
    }
}
