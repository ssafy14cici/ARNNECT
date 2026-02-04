package com.ssafy.arnnect.collectbook.domain.entity;

import com.ssafy.arnnect.collectbook.application.dto.request.UpdateTicketRequest;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "ticket_info")
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class TicketInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ticket_id")
    private Long ticketId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "ticket_code", nullable = false, length = 36)
    private String ticketCode;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "address", length = 100)
    private String address;

    @Column(name = "address_detail", length = 100)
    private String addressDetail;

    @Column(name = "qr_image_name", length = 500)
    private String qrImageName;

    @Column(name = "ticket_image_name", length = 500)
    private String ticketImageName;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void updateTicket(UpdateTicketRequest request, String qrImageName, String ticketImageName ){
        this.title = request.getTitle() != null? request.getTitle() : this.title;
        this.address = request.getAddress() != null? request.getAddress() : this.address;
        this.addressDetail = request.getAddressDetail() != null? request.getAddressDetail() : this.addressDetail;
        this.startDate = request.getStartDate() != null? request.getStartDate() : this.startDate;
        this.endDate = request.getEndDate() != null? request.getEndDate() : this.endDate;
        this.startTime = request.getStartTime() != null? request.getStartTime() : this.startTime;
        this.endTime = request.getEndTime() != null? request.getEndTime() : this.endTime;
        this.qrImageName = qrImageName != null? qrImageName : this.qrImageName;
        this.ticketImageName = ticketImageName != null? ticketImageName : this.ticketImageName;
    }

    public void deleteTicket(){
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
    }
}
