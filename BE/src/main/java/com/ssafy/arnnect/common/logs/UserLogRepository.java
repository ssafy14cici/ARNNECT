package com.ssafy.arnnect.common.logs;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserLogRepository extends JpaRepository<UserActionLog, Long> {
    List<UserActionLog> findByMemberUuid(String memberUuid);
}
