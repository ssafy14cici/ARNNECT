package com.ssafy.arnnect.artwork.repository;

import com.ssafy.arnnect.artwork.domain.entity.ArtworkTag;
import com.ssafy.arnnect.artwork.domain.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ArtworkTagRepository extends JpaRepository<ArtworkTag, Long> {
    @Modifying
    @Query("DELETE FROM ArtworkTag at WHERE at.artwork.artworkId = :artworkId")
    void deleteByArtworkId(@Param("artworkId") Long artworkId);

    @Query(value = """
        select t.tag_id ,t.name 
        from artwork_tag art
        left join tag t on art.tag_id = t.tag_id 
        where art.artwork_id = :artworkId;
    """,nativeQuery = true)
    List<Tag> getByArtworkId(@Param("artworkId") Long artworkId);
}
