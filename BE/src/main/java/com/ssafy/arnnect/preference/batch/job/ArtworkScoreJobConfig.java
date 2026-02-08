package com.ssafy.arnnect.preference.batch.job;

import com.ssafy.arnnect.preference.domain.UserArtworkScore;
import com.ssafy.arnnect.preference.repository.UserArtworkScoreRepository;
import jakarta.persistence.EntityManagerFactory;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
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
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ArtworkScoreJobConfig {

    private final EntityManagerFactory entityManagerFactory;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final UserArtworkScoreRepository userArtworkScoreRepository;

    private static final int CHUNK_SIZE = 1000;

    @Bean
    public Job artworkScoreJob() {
        return new JobBuilder("artworkScoreJob", jobRepository)
                .start(artworkScoreStep())
                .build();
    }

    @Bean
    public Step artworkScoreStep() {
        return new StepBuilder("artworkScoreStep", jobRepository)
                .<ArtworkLogDto, UserArtworkScore>chunk(CHUNK_SIZE, transactionManager)
                .reader(artworkLogReader())
                .processor(artworkScoreProcessor())
                .writer(artworkScoreWriter())
                .build();
    }

    @Bean
    public JpaPagingItemReader<ArtworkLogDto> artworkLogReader() {
        // 전날 00:00:00 ~ 23:59:59 데이터 조회
        String jpql = """
        SELECT new com.ssafy.arnnect.preference.batch.job.ArtworkScoreJobConfig$ArtworkLogDto(
            ul.memberUuid,
            ul.artworkId,
            COUNT(ul)
        )
        FROM UserActionLog ul
        WHERE ul.createdAt >= CURRENT_DATE - 1 DAY
          AND ul.createdAt < CURRENT_DATE
        GROUP BY ul.memberUuid, ul.artworkId
        """;

        return new JpaPagingItemReaderBuilder<ArtworkLogDto>()
                .name("artworkLogReader")
                .entityManagerFactory(entityManagerFactory)
                .queryString(jpql)
                .pageSize(CHUNK_SIZE)
                .build();
    }

    @Bean
    public ItemProcessor<ArtworkLogDto, UserArtworkScore> artworkScoreProcessor() {
        return logDto -> {
            log.debug("Processing artwork score - member: {}, artwork: {}, count: {}",
                    logDto.getMemberUuid(), logDto.getArtworkId(), logDto.getActionCount());

            // 기존 점수 조회 또는 새로 생성
            UserArtworkScore score = userArtworkScoreRepository
                    .findByMemberUuidAndArtworkId(logDto.getMemberUuid(), logDto.getArtworkId())
                    .orElse(UserArtworkScore.builder()
                            .memberUuid(logDto.getMemberUuid())
                            .artworkId(logDto.getArtworkId())
                            .score(0L)
                            .build());

            // 점수 누적
            score.addScore(logDto.getActionCount());

            return score;
        };
    }

    @Bean
    public ItemWriter<UserArtworkScore> artworkScoreWriter() {
        return items -> {
            userArtworkScoreRepository.saveAll(items);
            log.info("Saved {} artwork scores", items.size());
        };
    }

    // DTO
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArtworkLogDto {
        private String memberUuid;
        private Long artworkId;
        private Long actionCount;
    }
}