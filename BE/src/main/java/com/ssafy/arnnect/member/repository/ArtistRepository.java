package com.ssafy.arnnect.member.repository;

import com.ssafy.arnnect.member.domain.entity.Artist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ArtistRepository extends JpaRepository<Artist, Long> {
    Optional<Artist> findByMember_MemberUuid(String memberUuid);
}
