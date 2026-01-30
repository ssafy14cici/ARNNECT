package com.ssafy.arnnect.remind.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.ssafy.arnnect.remind.application.dto.response.RemindQuizResponse;

import java.util.List;

public interface RemindService {
    List<RemindQuizResponse> sendRemind(String memberUuid) throws JsonProcessingException;
}
