package com.ssafy.arnnect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class ArnnectApplication {

	public static void main(String[] args) {
		SpringApplication.run(ArnnectApplication.class, args);
	}

}
