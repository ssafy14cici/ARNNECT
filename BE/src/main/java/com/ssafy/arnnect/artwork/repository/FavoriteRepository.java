package com.ssafy.arnnect.artwork.repository;

import com.ssafy.arnnect.artwork.domain.entity.FavoriteArtwork;
import com.ssafy.arnnect.artwork.domain.entity.FavoriteArtworkId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<FavoriteArtwork, FavoriteArtworkId> {
    Optional<FavoriteArtwork> findByMember_MemberIdAndArtwork_ArtworkId(Long memberId, Long artworkId);
}
