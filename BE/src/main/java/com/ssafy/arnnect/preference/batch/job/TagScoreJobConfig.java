package com.ssafy.arnnect.preference.batch.job;

import com.ssafy.arnnect.preference.domain.UserTagScore;
import com.ssafy.arnnect.preference.repository.UserTagScoreRepository;
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
public class TagScoreJobConfig {

    private final EntityManagerFactory emf;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager txManager;
    private final UserTagScoreRepository userTagScoreRepository;

    private static final int CHUNK = 1000;

    @Bean
    public Job tagScoreJob() {
        return new JobBuilder("tagScoreJob", jobRepository)
                .start(deleteTagScoreStep())
                .next(tagScoreStep())
                .build();
    }

    /* ---------------- Step 1 : 기존 데이터 삭제 ---------------- */

    @Bean
    public Step deleteTagScoreStep() {
        return new StepBuilder("deleteTagScoreStep", jobRepository)
                .tasklet((c, ctx) -> {
                    log.info("=== user_tag_score 전체 삭제 ===");
                    userTagScoreRepository.deleteAllInBatch();
                    return RepeatStatus.FINISHED;
                }, txManager)
                .build();
    }

    /* ---------------- Step 2 : 집계 ---------------- */

    @Bean
    public Step tagScoreStep() {
        return new StepBuilder("tagScoreStep", jobRepository)
                .<Object[], UserTagScore>chunk(CHUNK, txManager)
                .reader(tagScoreReader())
                .processor(tagScoreProcessor())
                .writer(tagScoreWriter())
                .build();
    }

    @Bean
    public JpaPagingItemReader<Object[]> tagScoreReader() {
        String jpql = """
            SELECT 
                uas.memberUuid,
                at.tag.tagId,
                SUM(uas.score)
            FROM UserArtworkScore uas
            JOIN ArtworkTag at ON uas.artworkId = at.artwork.artworkId
            GROUP BY uas.memberUuid, at.tag.tagId
            """;

        return new JpaPagingItemReaderBuilder<Object[]>()
                .name("tagScoreReader")
                .entityManagerFactory(emf)
                .queryString(jpql)
                .pageSize(CHUNK)
                .build();
    }

    @Bean
    public ItemProcessor<Object[], UserTagScore> tagScoreProcessor() {
        return objects -> {
            String memberUuid = (String) objects[0];
            Number tagIdNum = (Number) objects[1];
            Number score = (Number) objects[2];

            return UserTagScore.builder()
                    .memberUuid(memberUuid)
                    .tagId(tagIdNum.longValue())
                    .score(score.longValue())
                    .build();
        };
    }

    @Bean
    public ItemWriter<UserTagScore> tagScoreWriter() {
        return chunk -> userTagScoreRepository.saveAll(chunk.getItems());
    }
}