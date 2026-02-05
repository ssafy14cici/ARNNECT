package com.ssafy.arnnect.common.logs;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserLogRepository extends JpaRepository<UserActionLog, Long> {
}
