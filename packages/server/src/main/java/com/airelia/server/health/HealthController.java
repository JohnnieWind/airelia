package com.airelia.server.health;

import java.time.Instant;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@Slf4j
public class HealthController {
    /**
     * 健康检查端点：用于前端和测试确认后端服务已经可用。
     */
    @GetMapping
    public HealthResponse health() {
        log.info("Handling GET /api/health");
        return new HealthResponse("ok", "airelia-server", Instant.now().toString());
    }

    /**
     * 健康检查响应体，包含状态、服务名和服务端时间戳。
     */
    public record HealthResponse(String status, String service, String timestamp) {
    }
}
