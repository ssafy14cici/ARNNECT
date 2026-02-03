package com.ssafy.arnnect.fanletter.domain.entity;

import com.ssafy.arnnect.fanletter.application.dto.request.AnswerRequest;
import com.ssafy.arnnect.fanletter.application.dto.request.FanLetterRequest;
import com.ssafy.arnnect.member.domain.entity.Member;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "fan_letter")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
@EntityListeners(AuditingEntityListener.class)
public class FanLetter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "fan_letter_id")
    private Long fanLetterId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_member_id")
    private Member member;

    @Column(name = "writer_id")
    private Long writerId;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "content", columnDefinition = "text", nullable = false)
    private String content;

    @Column(name = "answer", columnDefinition = "text")
    private String answer;

    @Column(name = "is_answered")
    private Boolean isAnswered;

    @Column(name = "artwork_id")
    private Long artworkId;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void updateFanLetter(FanLetterRequest request){
        this.content = request.getContent();
    }

    public void deleteFanLetter(){
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
    }

    public void updateAnswer(AnswerRequest request){
        this.answer = request.getAnswer();
    }

    public void deleteAnswer(){
        this.answer = null;
    }
}

