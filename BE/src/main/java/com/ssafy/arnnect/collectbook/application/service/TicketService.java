package com.ssafy.arnnect.collectbook.application.service;

import com.ssafy.arnnect.collectbook.application.dto.request.CreateTicketRequest;
import com.ssafy.arnnect.collectbook.application.dto.request.UpdateTicketRequest;
import com.ssafy.arnnect.collectbook.application.dto.response.CollectBookResponse;
import com.ssafy.arnnect.collectbook.application.dto.response.TicketInfoResponse;

import java.util.List;

public interface TicketService {
    void createTicket(String artistUuid, CreateTicketRequest request);
    void updateTicket(String artistUuid, Long ticketId, UpdateTicketRequest request);
    void deleteTicket(String artistUuid, Long ticketId);
    List<TicketInfoResponse> getTicketList(String artistUuid);

    void createCollect(String memberUuid, String ticketCode);
    Long getCollectBookCount(String memberUuid);
    List<CollectBookResponse> getCollectBookList(String memberUuid);
}
