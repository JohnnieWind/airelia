package com.airelia.server.agent;

import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.OpenAIChatModel;
import io.agentscope.harness.agent.HarnessAgent;
import io.agentscope.harness.agent.memory.compaction.CompactionConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Paths;
import java.util.Map;

/**
 * @author wuzhengyu
 */
@Service
public class AgentService {
    private final String testModelBaseUrl;
    private final String testModelName;
    private final String testModelApiKey;
    private HarnessAgent defaultAgent;

    public AgentService(
            @Value("${airelia.agent.test.base-url:https://api.minimaxi.com/v1}") String testModelBaseUrl,
            @Value("${airelia.agent.test.model-name:MiniMax-M3}") String testModelName,
            @Value("${airelia.agent.test.api-key:}") String testModelApiKey) {
        this.testModelBaseUrl = testModelBaseUrl;
        this.testModelName = testModelName;
        this.testModelApiKey = testModelApiKey;
    }

    public synchronized HarnessAgent getDefaultAgent() {
        if (testModelApiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Agent test model API key is not configured");
        }

        if (defaultAgent == null) {
            defaultAgent = createDefaultAgent();
        }

        return defaultAgent;
    }

    private HarnessAgent createDefaultAgent() {
        return HarnessAgent.builder()
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
    }
}
