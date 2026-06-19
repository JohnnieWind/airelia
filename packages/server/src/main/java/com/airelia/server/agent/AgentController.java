package com.airelia.server.agent;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
public class AgentController {
    @PostMapping("/echo")
    @ResponseStatus(HttpStatus.OK)
    public AgentEchoResponse echo(@Valid @RequestBody AgentEchoRequest request) {
        String reply = "Airelia agent scaffold received: " + request.message();
        return new AgentEchoResponse(reply, "scaffold-agent", Instant.now().toString());
    }

    public record AgentEchoRequest(@NotBlank String message) {
    }

    public record AgentEchoResponse(String reply, String agent, String timestamp) {
    }
}

