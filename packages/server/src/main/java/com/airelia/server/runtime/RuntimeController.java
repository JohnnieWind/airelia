package com.airelia.server.runtime;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/runtime")
@Slf4j
public class RuntimeController {
    // 通过固定类名探测 AgentScope Harness 依赖是否真的进入 classpath。
    private static final String HARNESS_AGENT_CLASS = "io.agentscope.harness.agent.HarnessAgent";

    // 从 application.yml 读取运行时名称，便于以后切换不同 Agent 后端。
    private final String runtimeName;

    public RuntimeController(@Value("${airelia.agent.runtime}") String runtimeName) {
        this.runtimeName = runtimeName;
    }

    /**
     * 返回当前 Java 运行时和 AgentScope Harness 可用性信息。
     */
    @GetMapping
    public RuntimeResponse runtime() {
        log.info("Handling GET /api/runtime");
        return new RuntimeResponse(
                runtimeName,
                System.getProperty("java.version"),
                isClassPresent(HARNESS_AGENT_CLASS),
                HARNESS_AGENT_CLASS
        );
    }

    /**
     * 使用反射做轻量级依赖探测，避免在接口层直接实例化 Harness 对象。
     */
    private boolean isClassPresent(String className) {
        try {
            Class.forName(className);
            return true;
        } catch (ClassNotFoundException ignored) {
            return false;
        }
    }

    /**
     * 前端 Runtime Details 面板消费的运行时状态响应。
     */
    public record RuntimeResponse(
            String agentRuntime,
            String javaVersion,
            boolean agentScopeHarnessAvailable,
            String harnessProbeClass
    ) {
    }
}
