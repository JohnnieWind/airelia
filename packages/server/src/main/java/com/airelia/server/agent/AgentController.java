package com.airelia.server.agent;

import java.nio.file.Paths;
import java.time.Instant;
import java.util.Map;

import io.agentscope.core.agent.RuntimeContext;
import io.agentscope.core.event.AgentEvent;
import io.agentscope.core.event.AgentEventType;
import io.agentscope.core.message.UserMessage;
import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.OpenAIChatModel;
import io.agentscope.harness.agent.HarnessAgent;
import io.agentscope.harness.agent.memory.compaction.CompactionConfig;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.server.ResponseStatusException;

import static io.agentscope.core.event.AgentEventType.REQUEST_STOP;

@RestController
@RequestMapping("/api/agent")
@Slf4j
public class AgentController {
    private final String testModelBaseUrl;
    private final String testModelName;
    private final String testModelApiKey;

    public AgentController(
            @Value("${airelia.agent.test.base-url:https://api.minimaxi.com/v1}") String testModelBaseUrl,
            @Value("${airelia.agent.test.model-name:MiniMax-M3}") String testModelName,
            @Value("${airelia.agent.test.api-key:}") String testModelApiKey) {
        this.testModelBaseUrl = testModelBaseUrl;
        this.testModelName = testModelName;
        this.testModelApiKey = testModelApiKey;
    }

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

    @Data
    public static class TestRequest {
        private String sessionId;
        private String userId;
        @NotBlank
        private String message;
    }

    @PostMapping("/test")
    public SseEmitter test(@Valid @RequestBody TestRequest testRequest) {
        log.info("Handling POST /api/agent/stream");
        if (testModelApiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Agent test model API key is not configured");
        }

        SseEmitter emitter = new SseEmitter(0L);

        HarnessAgent agent = HarnessAgent.builder()
                .name("default")
                .sysPrompt("你是一个AI助手。")
                // 字符串形式由 ModelRegistry 解析 —— 自动读取 DASHSCOPE_API_KEY；
                // 切换其他厂商时改用 "openai:gpt-5.5"、"anthropic:claude-sonnet-4-5"、
                // "gemini:gemini-2.0-flash" 或 "ollama:llama3"。
                .model(OpenAIChatModel.builder()
                        .baseUrl(testModelBaseUrl)
                        .modelName(testModelName)
                        .apiKey(testModelApiKey)
                        .generateOptions(GenerateOptions.builder()
                                .additionalBodyParams(Map.of("reasoning_split", true))
                                .build())
                        .stream(true)
                        .build())
                .workspace(Paths.get(".agentscope/default/workspace"))
                .compaction(CompactionConfig.builder()
                        .triggerMessages(30)
                        .keepMessages(10)
                        .build())
                .build();
        RuntimeContext ctx = RuntimeContext.builder()
                .sessionId(testRequest.getSessionId())
                .userId(testRequest.getUserId())
                .build();


        agent.streamEvents(new UserMessage(testRequest.getMessage()), ctx)
                .subscribe(
                        event -> sendEvent(emitter, event),
                        error -> {
                            log.warn("Agent stream failed", error);
                            sendEvent(emitter, new AgentEvent() {
                                @Override
                                public AgentEventType getType() {
                                    return REQUEST_STOP;
                                }
                            });
                            emitter.complete();
                        },
                        emitter::complete
                );
        return emitter;
    }

    private void sendEvent(SseEmitter emitter, AgentEvent event) {
        try {
            emitter.send(SseEmitter.event()
                    .name(event.getType().name())
                    .data(event, MediaType.APPLICATION_JSON));
        } catch (Exception exception) {
            log.warn("Unable to send agent stream event", exception);
            emitter.completeWithError(exception);
        }
    }
}
