package com.ssafy.arnnect.fanletter.application.service;

import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.fanletter.application.dto.request.AnswerRequest;
import com.ssafy.arnnect.fanletter.application.dto.request.FanLetterRequest;
import com.ssafy.arnnect.fanletter.application.dto.response.FanLetterResponse;
import com.ssafy.arnnect.fanletter.domain.entity.FanLetter;
import com.ssafy.arnnect.fanletter.repository.FanLetterRepository;
import com.ssafy.arnnect.member.application.service.MemberService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FanLetterServiceImpl implements FanLetterService{
    private final FanLetterRepository repository;
    private final MemberService memberService;

    @Override
    @Transactional
    public void createFanLetter(String memberUuid, FanLetterRequest request) {
        Long memberId = memberService.getMemberId(memberUuid);
        Long artistId = memberService.getMemberId(request.getMemberUuid());
        repository.save(request.toEntity(artistId, memberId));
    }

    @Override
    @Transactional
    public void updateFanLetter(Long fanLetterId, String memberUuid, FanLetterRequest request) {
        Long memberId = memberService.getMemberId(memberUuid);
        FanLetter fanLetter = repository.findByFanLetterIdAndWriterId(fanLetterId,memberId).orElseThrow(
                ()->new BusinessException(ErrorCode.FANLETTER_NOT_FOUND));
        fanLetter.updateFanLetter(request);
    }

    @Override
    @Transactional
    public void deleteFanLetter(String artistUuid, Long fanLetterId) {
        Long memberId = memberService.getMemberId(artistUuid);
        FanLetter fanLetter = repository.findByFanLetterIdAndWriterId(fanLetterId,memberId).orElseThrow(
                ()->new BusinessException(ErrorCode.FANLETTER_NOT_FOUND));
        fanLetter.deleteFanLetter();
    }

    @Override
    @Transactional
    public void createAnswer(Long fanLetterId, String artistUuid, AnswerRequest request) {
        Long memberId = memberService.getMemberId(artistUuid);
        FanLetter fanLetter = repository.findByFanLetterIdAndMember_MemberId(fanLetterId, memberId).orElseThrow(
                ()->new BusinessException(ErrorCode.FANLETTER_NOT_FOUND));
        fanLetter.updateAnswer(request);
    }

    @Override
    @Transactional
    public void deleteAnswer(Long fanLetterId, String artistUuid) {
        Long memberId = memberService.getMemberId(artistUuid);
        FanLetter fanLetter = repository.findByFanLetterIdAndMember_MemberId(fanLetterId, memberId).orElseThrow(
                ()->new BusinessException(ErrorCode.FANLETTER_NOT_FOUND));
        fanLetter.deleteAnswer();
    }

    @Override
    public List<FanLetterResponse> getFanLetterList(String artistUuid) {
        Long memberId = memberService.getMemberId(artistUuid);
        return repository.getFanLetterList(memberId);
    }
}
