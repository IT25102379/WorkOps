package com.workops.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class WorkOpsApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkOpsApplication.class, args);
    }
}
