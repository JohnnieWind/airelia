package com.airelia.server.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.airelia.server.AireliaServerApplication;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = AireliaServerApplication.class)
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class AgentControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void echoesAgentMessageThroughApi(CapturedOutput output) throws Exception {
        // 通过 MockMvc 走完整 Spring MVC 链路，验证请求体校验和 JSON 响应。
        mockMvc.perform(post("/api/agent/echo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"hello\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agent", equalTo("scaffold-agent")))
                .andExpect(jsonPath("$.reply", containsString("hello")));

        assertThat(output).contains("Handling POST /api/agent/echo");
    }

    @Test
    void rejectsAgentTestStreamWhenModelKeyIsNotConfigured() throws Exception {
        mockMvc.perform(post("/api/agent/test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"test-session\",\"userId\":\"test-user\",\"message\":\"hello\"}"))
                .andExpect(status().isServiceUnavailable());
    }
}
