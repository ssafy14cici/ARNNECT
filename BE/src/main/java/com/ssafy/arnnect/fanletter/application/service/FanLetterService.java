package com.ssafy.arnnect.fanletter.application.service;

import com.ssafy.arnnect.fanletter.application.dto.request.AnswerRequest;
import com.ssafy.arnnect.fanletter.application.dto.request.FanLetterRequest;
import com.ssafy.arnnect.fanletter.application.dto.response.FanLetterResponse;

import java.util.List;

public interface FanLetterService {
    void createFanLetter(String memberUuid, FanLetterRequest request);
    void updateFanLetter(Long fanLetterId, String memberUuid, FanLetterRequest request);
    void deleteFanLetter(String memberUuid, Long FanLetterId);
    void createAnswer(Long fanLetterId, String memberUuid, AnswerRequest request);
//    void updateAnswer(Long fanLetterId, String memberUuid, AnswerRequest request);
    void deleteAnswer(Long fanLetterId, String memberUuid);
    List<FanLetterResponse> getFanLetterList(String artistId);
}
