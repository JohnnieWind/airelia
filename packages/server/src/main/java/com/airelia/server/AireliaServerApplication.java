package com.airelia.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Airelia 后端的 Spring Boot 启动入口。
 */
@SpringBootApplication
public class AireliaServerApplication {
    public static void main(String[] args) {
        // 启动内嵌 Web 容器并加载所有 Spring Bean。
        SpringApplication.run(AireliaServerApplication.class, args);
    }
}
