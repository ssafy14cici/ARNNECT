package com.ssafy.arnnect.collectbook.application.service;

import com.ssafy.arnnect.collectbook.application.dto.request.CreateTicketRequest;
import com.ssafy.arnnect.collectbook.application.dto.request.UpdateTicketRequest;
import com.ssafy.arnnect.collectbook.application.dto.response.CollectBookResponse;
import com.ssafy.arnnect.collectbook.application.dto.response.TicketInfoResponse;
import com.ssafy.arnnect.collectbook.domain.entity.CollectBook;
import com.ssafy.arnnect.collectbook.domain.entity.TicketInfo;
import com.ssafy.arnnect.collectbook.repository.CollectionRepository;
import com.ssafy.arnnect.collectbook.repository.TicketRepository;
import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.common.file.FileStorageService;
import com.ssafy.arnnect.common.file.FileType;
import com.ssafy.arnnect.member.application.service.MemberService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketService{
    private final RedisTemplate<String, String> redisTemplate;
    private final FileStorageService fileService;
    private final MemberService memberService;
    private final TicketRepository repository;
    private final CollectionRepository collectionRepository;


    @Override
    @Transactional
    public void createTicket(String artistUuid, CreateTicketRequest request) {
        Long memberId = memberService.getMemberId(artistUuid);
        Map<String, String> ticket = fileService.saveFile(request.getTicketImage(), FileType.TICKET);
        Map<String, String> qrcode = fileService.saveFile(request.getQrImage(), FileType.QRCODE);
        try{
            repository.save(request.toEntity(memberId, qrcode.get("saved"), ticket.get("saved")));
            initializeRedisData(request.getTicketCode());
        }catch (Exception e){
            fileService.deleteFile(ticket.get("saved"), FileType.TICKET);
            fileService.deleteFile(qrcode.get("saved"), FileType.QRCODE);
        }
    }

    @Override
    @Transactional
    public void updateTicket(String artistUuid, Long ticketId, UpdateTicketRequest request) {
        Long memberId = memberService.getMemberId(artistUuid);
        Map<String, String> ticket = fileService.saveFile(request.getTicketImage(), FileType.TICKET);
        Map<String, String> qrcode = fileService.saveFile(request.getQrImage(), FileType.QRCODE);
        try{
            TicketInfo info = repository.findByTicketIdAndMemberId(ticketId, memberId).orElseThrow(
                    ()->new BusinessException(ErrorCode.TICKET_NOT_FOUND));

            String qr_origin = info.getQrImageName();
            String ticket_origin = info.getTicketImageName();

            info.updateTicket(request, qrcode.get("saved"), ticket.get("saved"));
            fileService.deleteFile(qr_origin, FileType.QRCODE);
            fileService.deleteFile(ticket_origin, FileType.TICKET);
        }catch (Exception e){
            fileService.deleteFile(ticket.get("saved"), FileType.TICKET);
            fileService.deleteFile(qrcode.get("saved"), FileType.QRCODE);
        }

    }

    @Override
    @Transactional
    public void deleteTicket(String artistUuid, Long ticketId) {
        Long memberId = memberService.getMemberId(artistUuid);

        TicketInfo info = repository.findByTicketIdAndMemberId(ticketId, memberId).orElseThrow(
                ()->new BusinessException(ErrorCode.TICKET_NOT_FOUND));
        info.deleteTicket();

        fileService.deleteFile(info.getQrImageName(), FileType.QRCODE);
        fileService.deleteFile(info.getTicketImageName(), FileType.TICKET);


    }

    @Override
    public List<TicketInfoResponse> getTicketList(String artistUuid) {
        Long memberId = memberService.getMemberId(artistUuid);
        return repository.findByMemberId(memberId).stream().map(TicketInfoResponse::from).toList();
    }

    @Override
    @Transactional
    public void createCollect(String memberUuid, String ticketCode) {
        Long memberId = memberService.getMemberId(memberUuid);

        String key = "ticket_" + ticketCode;

        try {
            TicketInfo ticketInfo = repository.findByTicketCode(ticketCode).orElseThrow(
                    () -> new BusinessException(ErrorCode.TICKET_NOT_FOUND));


            String value = redisTemplate.opsForValue().get(key);
            if (value == null) throw new BusinessException(ErrorCode.INVALID_TICKET_CODE);


            Long sequence = redisTemplate.opsForValue().increment(key);

            collectionRepository.save(CollectBook.builder()
                    .ticketId(ticketInfo.getTicketId())
                    .memberId(memberId)
                    .collectRank(sequence)
                    .createdAt(LocalDateTime.now())
                    .build());
        }catch (Exception e){
            redisTemplate.opsForValue().decrement(key);
        }

    }

    @Override
    public Long getCollectBookCount(String memberUuid) {
        Long memberId = memberService.getMemberId(memberUuid);
        System.out.println("member _ service"+memberId);
        return collectionRepository.countByMemberId(memberId);
    }

    @Override
    public List<CollectBookResponse> getCollectBookList(String memberUuid){
        Long memberId = memberService.getMemberId(memberUuid);
        return repository.getCollectBookList(memberId);
    }

    private void initializeRedisData(String ticketCode) {
        String key = "ticket_" + ticketCode;

        redisTemplate.opsForValue().set(key, "0");
    }
}