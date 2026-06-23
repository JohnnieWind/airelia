package com.airelia.server.agent;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import io.agentscope.core.agent.RuntimeContext;
import io.agentscope.core.event.AgentEvent;
import io.agentscope.core.event.AgentEventType;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.UserMessage;
import io.agentscope.core.state.AgentState;
import io.agentscope.core.state.AgentStateStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static io.agentscope.core.event.AgentEventType.REQUEST_STOP;

@RestController
@RequestMapping("/api/agent")
@Slf4j
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
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

        SseEmitter emitter = new SseEmitter(0L);

        RuntimeContext ctx = RuntimeContext.builder()
                .sessionId(testRequest.getSessionId())
                .userId(testRequest.getUserId())
                .build();


        agentService.getDefaultAgent().streamEvents(new UserMessage(testRequest.getMessage()), ctx)
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

    @GetMapping("/agent/sessionList")
    public Set<String> getSessionList(@RequestParam String userId){
        AgentStateStore stateStore = agentService.getDefaultAgent().getStateStore();
        Set<String> strings = stateStore.listSessionIds(userId);
        return strings;
    }


    @GetMapping("/agent/sessionContext")
    public List<Msg> getSessionContext(@RequestParam String userId,@RequestParam String sessionId){
        AgentState agentState = agentService.getDefaultAgent().getDelegate().getAgentState(userId, sessionId);
        List<Msg> context = agentState.getContext();
        return context;
    }
}
