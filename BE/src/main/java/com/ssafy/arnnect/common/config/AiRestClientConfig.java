package com.ssafy.arnnect.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class AiRestClientConfig {

    @Value("${recommend.ai.url}")
    String url;

    @Bean(name = "recommendRestClient")
    public RestClient recommendRestClient(RestClient.Builder builder) {
        return builder
                .baseUrl(url)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
