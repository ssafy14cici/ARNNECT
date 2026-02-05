package com.ssafy.arnnect.follow.domain.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FollowId implements Serializable {
    private Long sourceId;
    private Long targetId;
}
