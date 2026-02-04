package com.ssafy.arnnect.follow.repository;

import com.ssafy.arnnect.follow.domain.entity.Follow;
import com.ssafy.arnnect.follow.domain.entity.FollowId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    Follow findByFollowId(FollowId followId);
    Integer countByFollowId(FollowId followId);
}
