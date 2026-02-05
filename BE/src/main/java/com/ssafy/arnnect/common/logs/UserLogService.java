package com.ssafy.arnnect.common.logs;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;

@Service
@RequiredArgsConstructor
public class UserLogService {

    private final UserLogRepository userLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(
            String memberUuid,
            UserLogAction action,
            Long artworkId
    ) {
        UserActionLog log = UserActionLog.of(memberUuid, action, artworkId);
        userLogRepository.save(log);
    }
}