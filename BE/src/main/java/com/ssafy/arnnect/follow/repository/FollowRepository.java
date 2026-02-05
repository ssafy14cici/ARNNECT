package com.ssafy.arnnect.follow.repository;

import com.ssafy.arnnect.follow.domain.entity.Follow;
import com.ssafy.arnnect.follow.domain.entity.FollowId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    Optional<Follow> findBySourceIdAndTargetId(Long sourceId, Long targetId);
    boolean existsBySourceIdAndTargetId(Long sourceId, Long targetId);
    int countByTargetId(Long targetId);
    List<Follow> findBySourceId(Long sourceId);
    List<Follow> findByTargetId(Long targetId);
    void deleteBySourceIdAndTargetId(Long sourceId, Long targetId);
}
