package com.airelia.server.runtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/runtime")
public class RuntimeController {
    private static final String HARNESS_AGENT_CLASS = "io.agentscope.harness.agent.HarnessAgent";

    private final String runtimeName;

    public RuntimeController(@Value("${airelia.agent.runtime}") String runtimeName) {
        this.runtimeName = runtimeName;
    }

    @GetMapping
    public RuntimeResponse runtime() {
        return new RuntimeResponse(
                runtimeName,
                System.getProperty("java.version"),
                isClassPresent(HARNESS_AGENT_CLASS),
                HARNESS_AGENT_CLASS
        );
    }

    private boolean isClassPresent(String className) {
        try {
            Class.forName(className);
            return true;
        } catch (ClassNotFoundException ignored) {
            return false;
        }
    }

    public record RuntimeResponse(
            String agentRuntime,
            String javaVersion,
            boolean agentScopeHarnessAvailable,
            String harnessProbeClass
    ) {
    }
}

