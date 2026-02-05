package com.ssafy.arnnect.preference.repository;

import com.ssafy.arnnect.artwork.domain.entity.Artwork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PreferenceRepository extends JpaRepository<Artwork, Long> {

    @Query(value = "SELECT genre_id FROM art_genre ORDER BY RAND() LIMIT 4", nativeQuery = true)
    List<Long> findRandomGenreIds();
    
    @Query(value = """

            SELECT\s
            g.genre_id as genreId,
            g.name as genreName,
            aw.artwork_id,
            aw.saved_image_name as imageUrl,
            COALESCE(GROUP_CONCAT(DISTINCT t.name SEPARATOR ','), '') as tags
        FROM art_genre g
        JOIN artwork aw ON g.genre_id = aw.genre_id AND aw.is_deleted = 0
        LEFT JOIN artwork_tag at ON aw.artwork_id = at.artwork_id
        LEFT JOIN tag t ON at.tag_id = t.tag_id
        WHERE g.genre_id IN (1,2,3,4)
          AND aw.artwork_id IN (
            SELECT artwork_id FROM (
              SELECT artwork_id,
                     ROW_NUMBER() OVER (PARTITION BY genre_id ORDER BY RAND()) as rn
              FROM artwork\s
              WHERE genre_id IN (:genreIds) AND is_deleted = 0
            ) ranked WHERE rn <= 2
          )
        GROUP BY g.genre_id, aw.artwork_id
        ORDER BY g.genre_id;
        
        """, nativeQuery = true)
    List<Object[]> findRandomGenresWithArtworks(@Param("genreIds") List<Long> genreIds);
}
