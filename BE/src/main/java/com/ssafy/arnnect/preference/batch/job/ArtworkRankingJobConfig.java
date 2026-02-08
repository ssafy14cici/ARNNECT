package com.ssafy.arnnect.preference.batch.job;

import com.ssafy.arnnect.preference.domain.UserArtworkRanking;
import com.ssafy.arnnect.preference.repository.UserArtworkRankingRepository;
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
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.JpaPagingItemReader;
import org.springframework.batch.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ArtworkRankingJobConfig {

    private final EntityManagerFactory entityManagerFactory;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final UserArtworkRankingRepository userArtworkRankingRepository;

    private static final int CHUNK_SIZE = 1000;
    private static final int TOP_N = 100;

    @Bean
    public Job artworkRankingJob() {
        return new JobBuilder("artworkRankingJob", jobRepository)
                .start(deleteOldRankingStep())  // 1단계: 기존 데이터 삭제
                .next(artworkRankingStep())      // 2단계: 랭킹 집계
                .build();
    }

    /**
     * Step 1: 기존 랭킹 데이터 전체 삭제
     */
    @Bean
    public Step deleteOldRankingStep() {
        return new StepBuilder("deleteOldRankingStep", jobRepository)
                .tasklet(deleteOldRankingTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet deleteOldRankingTasklet() {
        return (contribution, chunkContext) -> {
            log.info("=== 기존 랭킹 데이터 삭제 시작 ===");
            userArtworkRankingRepository.deleteAllInBatch();
            log.info("=== 기존 랭킹 데이터 삭제 완료 ===");
            return RepeatStatus.FINISHED;
        };
    }

    /**
     * Step 2: 사용자별 상위 100개 작품 랭킹 생성
     */
    @Bean
    public Step artworkRankingStep() {
        return new StepBuilder("artworkRankingStep", jobRepository)
                .<ArtworkScoreDto, UserArtworkRanking>chunk(CHUNK_SIZE, transactionManager)
                .reader(artworkScoreReader())
                .processor(artworkRankingProcessor())
                .writer(artworkRankingWriter())
                .build();
    }

    @Bean
    public JpaPagingItemReader<ArtworkScoreDto> artworkScoreReader() {
        // 사용자별 점수 높은 순으로 조회
        String jpql = """
            SELECT new com.ssafy.arnnect.preference.batch.job.ArtworkRankingJobConfig$ArtworkScoreDto(
                uas.memberUuid,
                uas.artworkId,
                uas.score
            )
            FROM UserArtworkScore uas
            ORDER BY uas.memberUuid ASC, uas.score DESC
            """;

        return new JpaPagingItemReaderBuilder<ArtworkScoreDto>()
                .name("artworkScoreReader")
                .entityManagerFactory(entityManagerFactory)
                .queryString(jpql)
                .pageSize(CHUNK_SIZE)
                .build();
    }

    @Bean
    public ItemProcessor<ArtworkScoreDto, UserArtworkRanking> artworkRankingProcessor() {
        // 사용자별 랭킹 카운터 (Thread-safe)
        Map<String, AtomicLong> userRankMap = new HashMap<>();

        return scoreDto -> {
            String memberUuid = scoreDto.getMemberUuid();
            
            // 사용자별 현재 랭킹 가져오기 (1부터 시작)
            AtomicLong currentRank = userRankMap.computeIfAbsent(
                memberUuid, 
                k -> new AtomicLong(0)
            );
            
            long rank = currentRank.incrementAndGet();
            
            // TOP 100 이내만 처리
            if (rank > TOP_N) {
                return null; // null 반환 시 Writer에 전달되지 않음
            }
            
            log.debug("Processing ranking - member: {}, artwork: {}, rank: {}", 
                    memberUuid, scoreDto.getArtworkId(), rank);
            
            return UserArtworkRanking.builder()
                    .memberUuid(memberUuid)
                    .artworkId(scoreDto.getArtworkId())
                    .ranking(rank)
                    .build();
        };
    }

    @Bean
    public ItemWriter<UserArtworkRanking> artworkRankingWriter() {
        return items -> {
            if (!items.isEmpty()) {
                userArtworkRankingRepository.saveAll(items.getItems());
                log.info("Saved {} artwork rankings", items.size());
            }
        };
    }


    // DTO
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArtworkScoreDto {
        private String memberUuid;
        private Long artworkId;
        private Long score;
    }
}