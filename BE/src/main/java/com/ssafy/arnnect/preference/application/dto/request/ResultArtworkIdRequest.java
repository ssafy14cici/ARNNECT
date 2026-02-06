package com.ssafy.arnnect.preference.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class ResultArtworkIdRequest {
    List<Long> artworkIdList;
}
