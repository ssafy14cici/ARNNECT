package com.ssafy.arnnect.collectbook.presentation.controller;

import com.ssafy.arnnect.collectbook.application.dto.request.CreateTicketRequest;
import com.ssafy.arnnect.collectbook.application.dto.request.UpdateTicketRequest;
import com.ssafy.arnnect.collectbook.application.dto.response.CollectBookResponse;
import com.ssafy.arnnect.collectbook.application.dto.response.TicketInfoResponse;
import com.ssafy.arnnect.collectbook.application.service.TicketService;
import com.ssafy.arnnect.security.SecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
public class CollectController {

    private final TicketService service;

    @PostMapping
    public ResponseEntity<Void> createTicket(@ModelAttribute CreateTicketRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createTicket(memberUuid, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("{ticketId}")
    public ResponseEntity<Void> createTicket(@PathVariable Long ticketId,
                                             @ModelAttribute UpdateTicketRequest request){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.updateTicket(memberUuid, ticketId, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("{ticketId}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long ticketId){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.deleteTicket(memberUuid, ticketId);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<TicketInfoResponse>> getTicketList(@RequestParam String artist){
        return ResponseEntity.ok(service.getTicketList(artist));
    }

    @GetMapping("/ticket-scan")
    public ResponseEntity<Void> createCollect(@RequestParam String ticket){
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        service.createCollect(memberUuid, ticket);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{memberUuid}/count")
    public ResponseEntity<Long> getCollectBookCount(@PathVariable String memberUuid){
        System.out.println("member _ controller"+memberUuid);
        return ResponseEntity.ok(service.getCollectBookCount(memberUuid));
    }

    @GetMapping("/list/{memberUuid}")
    public ResponseEntity<List<CollectBookResponse>> getCollectBookList(@PathVariable String memberUuid){
        return ResponseEntity.ok(service.getCollectBookList(memberUuid));
    }
}
