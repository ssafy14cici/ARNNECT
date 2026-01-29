package com.ssafy.arnnect.member.repository;

import com.ssafy.arnnect.member.application.dto.response.MemberInfoResponse;
import com.ssafy.arnnect.member.domain.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByEmail(String email);
    Optional<Member> findByMemberUuid(String memberUuid);
    boolean existsByEmail(String email);

    @Query(value = """
        SELECT
            v.nickname,
            v.is_artist,
            v.is_new,
            v.field_name,
            v.genre_name,
            v.debut_year,
            v.sns_page,
            v.profile_image,
            v.introduction,
            v.affiliation,
            v.followers,
            v.followings,
            IF(EXISTS (
                     SELECT 1
                     FROM follow f
                     WHERE f.source_id = :viewerId
                     AND f.target_id = v.member_id
            ), 1, 0) AS is_follows
        FROM member_profile_view v
        WHERE v.member_uuid = :memberUuid
        """, nativeQuery = true)
    MemberInfoResponse findMemberInfo(@Param("memberUuid") String targetUuid, @Param("viewerId") long myId);
}
