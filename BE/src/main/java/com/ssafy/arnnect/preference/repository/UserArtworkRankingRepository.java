package com.ssafy.arnnect.preference.repository;

import com.ssafy.arnnect.preference.domain.UserArtworkRanking;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserArtworkRankingRepository extends JpaRepository<UserArtworkRanking, Long> {
}
