package com.ssafy.arnnect.review.domain.entity;

import com.ssafy.arnnect.artwork.domain.entity.Artwork;
import com.ssafy.arnnect.artwork.domain.entity.Tag;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "review_tag")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewTag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_tag_id")
    private Long reviewTagId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id")
    private Review review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id")
    private Tag tag;
}
