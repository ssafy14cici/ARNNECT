package com.ssafy.arnnect.preference.batch.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class LogBatchScheduler {

    private final JobLauncher jobLauncher;
    private final Job artworkScoreJob;
    private final Job artworkRankingJob;
    private final Job genreScoreJob;
    private final Job tagScoreJob;
    private final Job artistScoreJob;
    private final Job activitySummaryJob;

    /**
     * 매일 01:00 - 선호 작품 점수 집계
     */
        @Scheduled(cron = "0 0 10 * * *")
    public void runArtworkScoreJob() {
        try {
            log.info("=== 선호 작품 점수 집계 Job 시작 ===");
            JobParameters params = new JobParametersBuilder()
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();
            jobLauncher.run(artworkScoreJob, params);
            log.info("=== 선호 작품 점수 집계 Job 완료 ===");
        } catch (Exception e) {
            log.error("선호 작품 점수 집계 Job 실패", e);
        }
    }

    /**
     * 매일 02:00 - 선호 작품 랭킹 집계
     */
    @Scheduled(cron = "0 5 10 * * *")
    public void runArtworkRankingJob() {
        try {
            log.info("=== 선호 작품 랭킹 집계 Job 시작 ===");
            JobParameters params = new JobParametersBuilder()
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();
            jobLauncher.run(artworkRankingJob, params);
            log.info("=== 선호 작품 랭킹 집계 Job 완료 ===");
        } catch (Exception e) {
            log.error("선호 작품 랭킹 집계 Job 실패", e);
        }
    }

    /**
     * 매일 03:00 - 선호 장르 점수 집계
     */
    @Scheduled(cron = "0 10 10 * * *")
    public void runGenreScoreJob() {
        try {
            log.info("=== 선호 장르 점수 집계 Job 시작 ===");
            JobParameters params = new JobParametersBuilder()
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();
            jobLauncher.run(genreScoreJob, params);
            log.info("=== 선호 장르 점수 집계 Job 완료 ===");
        } catch (Exception e) {
            log.error("선호 장르 점수 집계 Job 실패", e);
        }
    }

    /**
     * 매일 03:10 - 선호 태그 점수 집계
     */
    @Scheduled(cron = "0 15 10 * * *")
    public void runTagScoreJob() {
        try {
            log.info("=== 선호 태그 점수 집계 Job 시작 ===");
            JobParameters params = new JobParametersBuilder()
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();
            jobLauncher.run(tagScoreJob, params);
            log.info("=== 선호 태그 점수 집계 Job 완료 ===");
        } catch (Exception e) {
            log.error("선호 태그 점수 집계 Job 실패", e);
        }
    }

    /**
     * 매일 03:20 - 선호 작가 점수 집계
     */
    @Scheduled(cron = "0 20 10 * * *")
    public void runArtistScoreJob() {
        try {
            log.info("=== 선호 작가 점수 집계 Job 시작 ===");
            JobParameters params = new JobParametersBuilder()
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();
            jobLauncher.run(artistScoreJob, params);
            log.info("=== 선호 작가 점수 집계 Job 완료 ===");
        } catch (Exception e) {
            log.error("선호 작가 점수 집계 Job 실패", e);
        }
    }

    /**
     * 매일 04:00 - 활동 요약 집계
     */
    @Scheduled(cron = "0 25 10 * * *")
    public void runActivitySummaryJob() {
        try {
            log.info("=== 활동 요약 집계 Job 시작 ===");
            JobParameters params = new JobParametersBuilder()
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();
            jobLauncher.run(activitySummaryJob, params);
            log.info("=== 활동 요약 집계 Job 완료 ===");
        } catch (Exception e) {
            log.error("활동 요약 집계 Job 실패", e);
        }
    }
}