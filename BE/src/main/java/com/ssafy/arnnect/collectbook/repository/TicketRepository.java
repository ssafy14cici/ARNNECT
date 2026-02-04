package com.ssafy.arnnect.collectbook.repository;

import com.ssafy.arnnect.collectbook.application.dto.response.CollectBookResponse;
import com.ssafy.arnnect.collectbook.domain.entity.TicketInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<TicketInfo, Long> {
    Optional<TicketInfo> findByTicketIdAndMemberId(Long ticketId, Long memberId);
    List<TicketInfo> findByMemberId(Long memberId);
    Optional<TicketInfo> findByTicketCode(String ticketCode);

    @Query(value = """
        select\s
        	m.member_uuid as artist_uuid,
        	ti.ticket_code,
        	cb.collect_rank,
        	ti.title,
        	ti.address,
        	ti.address_detail,
        	ti.start_date,
        	ti.end_date,
        	ti.start_time,
        	ti.end_time,
        	cb.created_at,
        	concat('qrcode', ti.qr_image_name) as qr_image_url,
        	concat('ticket',ti.ticket_image_name) as ticket_image_url
        from ticket_info ti\s
        left join collect_book cb on cb.ticket_id = ti.ticket_id\s
        left join member m on m.member_id = ti.member_id\s
        where cb.member_id = :memberId;
    """, nativeQuery = true)
    List<CollectBookResponse> getCollectBookList(Long memberId);
}
