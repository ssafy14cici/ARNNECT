package com.ssafy.arnnect.preference.repository;

import com.ssafy.arnnect.preference.domain.UserArtistScore;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserArtistScoreRepository extends JpaRepository<UserArtistScore, Long> {
}
