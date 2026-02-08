package com.ssafy.arnnect.preference.batch.job;

import com.ssafy.arnnect.preference.domain.UserActivitySummary;
import com.ssafy.arnnect.preference.repository.UserActivitySummaryRepository;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.JpaPagingItemReader;
import org.springframework.batch.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ActivitySummaryJobConfig {

    private final EntityManagerFactory emf;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager txManager;
    private final UserActivitySummaryRepository userActivitySummaryRepository;

    private static final int CHUNK = 1000;

    @Bean
    public Job activitySummaryJob() {
        return new JobBuilder("activitySummaryJob", jobRepository)
                .start(deleteActivitySummaryStep())
                .next(activitySummaryStep())
                .build();
    }

    /* ---------------- Step 1 : 기존 데이터 삭제 ---------------- */

    @Bean
    public Step deleteActivitySummaryStep() {
        return new StepBuilder("deleteActivitySummaryStep", jobRepository)
                .tasklet((c, ctx) -> {
                    log.info("=== user_activity_summary 전체 삭제 ===");
                    userActivitySummaryRepository.deleteAllInBatch();
                    return RepeatStatus.FINISHED;
                }, txManager)
                .build();
    }

    /* ---------------- Step 2 : 집계 ---------------- */

    @Bean
    public Step activitySummaryStep() {
        return new StepBuilder("activitySummaryStep", jobRepository)
                .<Object[], UserActivitySummary>chunk(CHUNK, txManager)
                .reader(activitySummaryReader())
                .processor(activitySummaryProcessor())
                .writer(activitySummaryWriter())
                .build();
    }

    @Bean
    public JpaPagingItemReader<Object[]> activitySummaryReader() {
        // 최근 30일 데이터
        LocalDateTime startDate = LocalDate.now().minusDays(30).atStartOfDay();

        String jpql = """
            SELECT 
                ul.memberUuid,
                SUM(CASE WHEN ul.action = 'LIKE' THEN 1 ELSE 0 END),
                SUM(CASE WHEN ul.action = 'COMMENT' THEN 1 ELSE 0 END)
            FROM UserActionLog ul
            WHERE ul.createdAt >= :startDate
            GROUP BY ul.memberUuid
            """;

        return new JpaPagingItemReaderBuilder<Object[]>()
                .name("activitySummaryReader")
                .entityManagerFactory(emf)
                .queryString(jpql)
                .parameterValues(Map.of("startDate", startDate))
                .pageSize(CHUNK)
                .build();
    }

    @Bean
    public ItemProcessor<Object[], UserActivitySummary> activitySummaryProcessor() {
        return objects -> {
            String memberUuid = (String) objects[0];
            Number favoriteCnt = (Number) objects[1];
            Number commentCnt = (Number) objects[2];

            return UserActivitySummary.builder()
                    .memberUuid(memberUuid)
                    .favoriteCnt(favoriteCnt.longValue())
                    .commentCnt(commentCnt.longValue())
                    .build();
        };
    }

    @Bean
    public ItemWriter<UserActivitySummary> activitySummaryWriter() {
        return chunk -> userActivitySummaryRepository.saveAll(chunk.getItems());
    }
}