package com.ssafy.arnnect.artwork.repository;

import com.ssafy.arnnect.artwork.application.dto.response.ArtworkResponse;
import com.ssafy.arnnect.artwork.domain.entity.ArtworkDetail;
import com.ssafy.arnnect.artwork.domain.entity.Artwork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ArtworkRepository extends JpaRepository<Artwork, Long> {

    Optional<Artwork> findByArtworkIdAndMemberIdAndIsDeleted(Long artworkId, Long memberId,Boolean isDeleted);
    @Query(value = """
    SELECT 
        a.artwork_id,
        m.member_uuid,
        m.nickname,
        a.field_id,
        af.name,
        a.genre_id,
        ag.name,
        a.title,
        a.description,
        a.production_date,
        a.size,
        a.saved_image_name as image_url,
        (SELECT COUNT(*) FROM favorite_artwork fa
         WHERE fa.artwork_id = :artworkId AND fa.is_favorite = 1) as like_count
    FROM artwork a 
    LEFT JOIN member m ON m.member_id = a.member_id
    LEFT JOIN art_field af ON af.field_id = a.field_id
    LEFT JOIN art_genre ag ON ag.genre_id = a.genre_id
    WHERE a.artwork_id = :artworkId AND a.is_deleted = false
    """, nativeQuery = true)
    Optional<ArtworkDetail> findByDetailArtwork(@Param("artworkId")Long artwork);

    @Query(value = """
    select\s
    	a.artwork_id,
    	m.member_uuid,
    	m.nickname,
    	a.title,
    	a.saved_image_name as image_url,
    	(	select count(*)
    		from favorite_artwork fa
    		where fa.artwork_id = a.artwork_id and fa.is_favorite=1) as like_count
    from artwork a
    left join member m on m.member_id = a.member_id
    order by a.artwork_id DESC;
    """, nativeQuery = true)
    List<ArtworkResponse> findAllOrderDesc();

    @Query(value = """
    select
        a.artwork_id,
        m.member_uuid,
        m.nickname,
        a.title,
        a.saved_image_name as image_url,
        (
            select count(*)
            from favorite_artwork fa
            where fa.artwork_id = a.artwork_id and fa.is_favorite=1) as like_count
    from artwork a\s
    left join member m on m.member_id = a.member_id\s
    where m.member_uuid = :memberUuid
    order by a.artwork_id DESC;
    """, nativeQuery = true)
    List<ArtworkResponse> findArtworkByArtist(@Param("memberUuid") String memberUuid);
}
