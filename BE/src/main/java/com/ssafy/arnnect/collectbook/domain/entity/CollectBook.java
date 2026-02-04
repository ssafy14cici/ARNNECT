package com.ssafy.arnnect.collectbook.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "collect_book")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class CollectBook {
    
    @Id
    @Column(name = "user_ticket_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userTicketId;
    
    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;
    
    @Column(name = "member_id", nullable = false)
    private Long memberId;
    
    @Column(name = "collect_rank")
    private Long collectRank;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

}