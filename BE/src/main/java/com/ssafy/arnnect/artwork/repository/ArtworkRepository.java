package com.ssafy.arnnect.artwork.repository;

import com.ssafy.arnnect.artwork.application.dto.response.ArtworkResponse;
import com.ssafy.arnnect.artwork.application.dto.response.NewArtistRepresentativeResponse;
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
    where a.is_deleted = false
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
    where m.member_uuid = :memberUuid and a.is_deleted = false
    order by a.artwork_id DESC;
    """, nativeQuery = true)
    List<ArtworkResponse> findArtworkByArtist(@Param("memberUuid") String memberUuid);

    @Query(value = """
        SELECT DISTINCT 
            m.member_uuid,
            m.nickname,
            aw.artwork_id,
            aw.title,
            aw.description,
            aw.production_date,
            aw.saved_image_name
        FROM artwork aw
        JOIN artist at ON at.member_id = aw.member_id AND at.is_new = true
        JOIN member m ON m.member_id = aw.member_id
        WHERE aw.is_deleted = false
          AND aw.member_id IN (
              SELECT member_id FROM artwork\s
              WHERE is_deleted = false\s
              GROUP BY member_id HAVING COUNT(*) >= 6
          )
          AND aw.artwork_id = (
              SELECT MAX(a2.artwork_id)
              FROM artwork a2
              WHERE a2.member_id = aw.member_id AND a2.is_deleted = false
          )
        ORDER BY aw.artwork_id DESC
        LIMIT 6;
    """, nativeQuery = true)
    List<NewArtistRepresentativeResponse> getNewArtist();


    @Query("""
        select g.genreId
        from Artwork a
        left join ArtGenre g on g.genreId = a.genre.genreId
        where a.artworkId in :artworkIds
    """)
    List<Long> findGenreIdsByArtworkIds(List<Long> artworkIds);

    @Query(value = """
    SELECT 
        a.artwork_id,
        m.member_uuid,
        m.nickname,
        a.title,
        a.saved_image_name as image_url,
        (SELECT COUNT(*)
         FROM favorite_artwork fa
         WHERE fa.artwork_id = a.artwork_id AND fa.is_favorite = 1) as like_count
    FROM artwork a
    LEFT JOIN member m ON m.member_id = a.member_id
    WHERE a.is_deleted = false
      AND a.artwork_id IN :artworkIds
    """, nativeQuery = true)
    List<ArtworkResponse> findByArtworkIdIn(@Param("artworkIds") List<Long> artworkIds);
}
