package com.ssafy.arnnect.preference.repository;

import com.ssafy.arnnect.preference.application.dto.response.ActivitySummaryResponse;
import com.ssafy.arnnect.preference.application.dto.response.CommonResponse;
import com.ssafy.arnnect.preference.domain.UserArtworkRanking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
public interface CommonRepository extends JpaRepository<UserArtworkRanking, Long> {
    @Query(value = """
        select ag.name, ugs.score
        from user_genre_score ugs\s
        left join art_genre ag on ugs.genre_id = ag.genre_id\s
        where ugs.member_uuid = :memberUuid
        order by ugs.score desc
        LIMIT 6
    """, nativeQuery = true)
    List<CommonResponse> getTopGenre(String memberUuid);

    @Query(value = """
        select t.name, u.score
        from user_tag_score u
        left join tag t on u.tag_id = t.tag_id
        where u.member_uuid = :memberUuid
        order by u.score desc
        LIMIT 3
    """, nativeQuery = true)
    List<CommonResponse>  getTopTag(@Param("memberUuid") String memberUuid);

    @Query(value = """
        select m.nickname , uas.score\s
        from user_artist_score uas\s
        left join `member` m  on m.member_uuid = uas.artist_uuid\s
        where uas.member_uuid = '7c409535-3bd2-4d43-bc13-a1776fc4172f'
        order by uas.score desc
        LIMIT 3  
     """, nativeQuery = true)
    List<CommonResponse>  getTopArtist(@Param("memberUuid") String memberUuid);

    @Query(value = """
        select uas.favorite_cnt , uas.comment_cnt, 0 as ticket_cnt
        from user_activity_summary uas\s
        where uas.member_uuid = :memberUuid
    """, nativeQuery = true)
    ActivitySummaryResponse getActivitySummary(@Param("memberUuid") String memberUuid);
}
