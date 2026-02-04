package com.ssafy.arnnect.collectbook.repository;

import com.ssafy.arnnect.collectbook.domain.entity.CollectBook;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectionRepository extends JpaRepository<CollectBook, Long> {
    Boolean existsByMemberIdAndTicketId(Long memberId, Long ticketId);
    Long countByMemberId(Long memberId);
}