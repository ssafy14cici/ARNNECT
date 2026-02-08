package com.ssafy.arnnect.preference.repository;

import com.ssafy.arnnect.preference.domain.UserActivitySummary;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserActivitySummaryRepository extends JpaRepository<UserActivitySummary,Long> {
}
