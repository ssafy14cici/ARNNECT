package com.ssafy.arnnect.fanletter.repository;

import com.ssafy.arnnect.fanletter.application.dto.response.FanLetterResponse;
import com.ssafy.arnnect.fanletter.domain.entity.FanLetter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FanLetterRepository extends JpaRepository<FanLetter, Long> {
    Optional<FanLetter> findByFanLetterIdAndWriterId(Long fanLetterId, Long memberId);
    Optional<FanLetter> findByFanLetterIdAndMember_MemberId(Long fanLetterId, Long artistId);
    @Query(value = """
        select\s
        	fl.fan_letter_id ,
         	a.artwork_id ,
         	a.title as artwork_name,
         	m.nickname ,
         	fl.title,
         	fl.content ,
         	fl.created_at ,
         	fl.answer\s
        from fan_letter fl\s
        left join member m on m.member_id = fl.writer_id
        left join artwork a on a.artwork_id = fl.artwork_id\s
        where fl.artist_member_id = :artistId
    """, nativeQuery = true)
    List<FanLetterResponse> getFanLetterList(@Param("artistId") Long artistId);
}
