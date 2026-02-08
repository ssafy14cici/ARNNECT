package com.ssafy.arnnect.preference.repository;

import com.ssafy.arnnect.preference.domain.UserArtworkScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserArtworkScoreRepository extends JpaRepository<UserArtworkScore, Long> {
    Optional<UserArtworkScore> findByMemberUuidAndArtworkId(String memberUuid, Long artworkId);
}
