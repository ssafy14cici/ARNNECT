package com.ssafy.arnnect.preference.batch.job;

import com.ssafy.arnnect.preference.domain.UserGenreScore;
import com.ssafy.arnnect.preference.repository.UserGenreScoreRepository;
import jakarta.persistence.EntityManagerFactory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.JpaPagingItemReader;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class GenreScoreJobConfig {

    private final EntityManagerFactory emf;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager txManager;
    private final UserGenreScoreRepository userGenreScoreRepository;

    private static final int CHUNK = 1000;

    @Bean
    public Job genreScoreJob() {
        return new JobBuilder("genreScoreJob", jobRepository)
                .start(deleteGenreScoreStep())
                .next(genreScoreStep())
                .build();
    }

    /* ---------------- Step 1 : 기존 데이터 삭제 ---------------- */

    @Bean
    public Step deleteGenreScoreStep() {
        return new StepBuilder("deleteGenreScoreStep", jobRepository)
                .tasklet((c, ctx) -> {
                    log.info("=== user_genre_score 전체 삭제 ===");
                    userGenreScoreRepository.deleteAllInBatch();
                    return RepeatStatus.FINISHED;
                }, txManager)
                .build();
    }

    /* ---------------- Step 2 : 집계 ---------------- */

    @Bean
    public Step genreScoreStep() {
        return new StepBuilder("genreScoreStep", jobRepository)
                .<Object[], UserGenreScore>chunk(CHUNK, txManager)  // 변경
                .reader(genreScoreReader())
                .processor(genreScoreProcessor())
                .writer(genreScoreWriter())
                .build();
    }

    @Bean
    public JpaPagingItemReader<Object[]> genreScoreReader() {  // 변경
        String jpql = """
            SELECT 
                uas.memberUuid,
                a.genre.genreId,
                SUM(uas.score)
            FROM UserArtworkScore uas
            JOIN Artwork a ON uas.artworkId = a.artworkId
            GROUP BY uas.memberUuid, a.genre.genreId
        """;

        return new JpaPagingItemReaderBuilder<Object[]>()  // 변경
                .name("genreScoreReader")
                .entityManagerFactory(emf)
                .queryString(jpql)
                .pageSize(CHUNK)
                .build();
    }

    @Bean
    public ItemProcessor<Object[], UserGenreScore> genreScoreProcessor() {
        return objects -> {
            String memberUuid = (String) objects[0];
            Number genreIdNum = (Number) objects[1];  // Number로 받기
            Number score = (Number) objects[2];

            return UserGenreScore.builder()
                    .memberUuid(memberUuid)
                    .genreId(genreIdNum.longValue())  // longValue()로 변환
                    .score(score.longValue())
                    .build();
        };
    }

    @Bean
    public ItemWriter<UserGenreScore> genreScoreWriter() {
        return chunk -> userGenreScoreRepository.saveAll(chunk.getItems());
    }

    // GenreScoreDto 클래스는 더 이상 필요 없음 - 삭제
}