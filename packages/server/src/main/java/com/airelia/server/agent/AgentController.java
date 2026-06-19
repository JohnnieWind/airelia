package com.airelia.server.agent;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
@Slf4j
public class AgentController {
    /**
     * 临时 echo 端点：用于验证前端、Electron 和后端之间的请求链路。
     */
    @PostMapping("/echo")
    @ResponseStatus(HttpStatus.OK)
    public AgentEchoResponse echo(@Valid @RequestBody AgentEchoRequest request) {
        log.info("Handling POST /api/agent/echo");
        // 当前还未接入真实 Agent，这里先把用户消息拼入固定回复。
        String reply = "Airelia agent scaffold received: " + request.message();
        return new AgentEchoResponse(reply, "scaffold-agent", Instant.now().toString());
    }

    /**
     * echo 请求体，message 必须非空才能通过 Jakarta Validation 校验。
     */
    public record AgentEchoRequest(@NotBlank String message) {
    }

    /**
     * echo 响应体，包含回复内容、Agent 标识和服务端时间戳。
     */
    public record AgentEchoResponse(String reply, String agent, String timestamp) {
    }
}
