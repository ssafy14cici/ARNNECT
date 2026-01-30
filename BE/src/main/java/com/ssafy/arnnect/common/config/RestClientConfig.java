package com.ssafy.arnnect.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${remind.ai.url}")
    String url;

    @Value("${remind.ai.key}")
    String key;

    @Bean
    public RestClient restClient(RestClient.Builder builder) {
        return builder
                .baseUrl(url)
                .defaultHeader("Content-Type","application/json")
                .defaultHeader("Authorization", "Bearer " + key)
                .build();
    }
}
