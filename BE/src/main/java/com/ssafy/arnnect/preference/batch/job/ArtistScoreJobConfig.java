package com.ssafy.arnnect.preference.batch.job;

import com.ssafy.arnnect.preference.domain.UserArtistScore;
import com.ssafy.arnnect.preference.repository.UserArtistScoreRepository;
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

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ArtistScoreJobConfig {

    private final EntityManagerFactory emf;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager txManager;
    private final UserArtistScoreRepository userArtistScoreRepository;

    private static final int CHUNK = 1000;

    @Bean
    public Job artistScoreJob() {
        return new JobBuilder("artistScoreJob", jobRepository)
                .start(deleteArtistScoreStep())
                .next(artistScoreStep())
                .build();
    }

    /* ---------------- Step 1 : 기존 데이터 삭제 ---------------- */

    @Bean
    public Step deleteArtistScoreStep() {
        return new StepBuilder("deleteArtistScoreStep", jobRepository)
                .tasklet((c, ctx) -> {
                    log.info("=== user_artist_score 전체 삭제 ===");
                    userArtistScoreRepository.deleteAllInBatch();
                    return RepeatStatus.FINISHED;
                }, txManager)
                .build();
    }

    /* ---------------- Step 2 : 집계 ---------------- */

    @Bean
    public Step artistScoreStep() {
        return new StepBuilder("artistScoreStep", jobRepository)
                .<Object[], UserArtistScore>chunk(CHUNK, txManager)
                .reader(artistScoreReader())
                .processor(artistScoreProcessor())
                .writer(artistScoreWriter())
                .build();
    }

    @Bean
    public JpaPagingItemReader<Object[]> artistScoreReader() {
        String jpql = """
            SELECT 
                uas.memberUuid,
                m.memberUuid,
                SUM(uas.score)
            FROM UserArtworkScore uas
            JOIN Artwork a ON uas.artworkId = a.artworkId
            JOIN Member m ON a.memberId = m.memberId
            GROUP BY uas.memberUuid, m.memberUuid
            """;

        return new JpaPagingItemReaderBuilder<Object[]>()
                .name("artistScoreReader")
                .entityManagerFactory(emf)
                .queryString(jpql)
                .pageSize(CHUNK)
                .build();
    }

    @Bean
    public ItemProcessor<Object[], UserArtistScore> artistScoreProcessor() {
        return objects -> {
            String memberUuid = (String) objects[0];
            String artistUuid = (String) objects[1];
            Number score = (Number) objects[2];

            return UserArtistScore.builder()
                    .memberUuid(memberUuid)
                    .artistUuid(artistUuid)
                    .score(score.longValue())
                    .build();
        };
    }

    @Bean
    public ItemWriter<UserArtistScore> artistScoreWriter() {
        return chunk -> userArtistScoreRepository.saveAll(chunk.getItems());
    }
}