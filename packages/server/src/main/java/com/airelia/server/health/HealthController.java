package com.airelia.server.health;

import java.time.Instant;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("ok", "airelia-server", Instant.now().toString());
    }

    public record HealthResponse(String status, String service, String timestamp) {
    }
}

