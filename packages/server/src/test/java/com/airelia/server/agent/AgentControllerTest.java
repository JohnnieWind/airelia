package com.airelia.server.agent;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.airelia.server.AireliaServerApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = AireliaServerApplication.class)
@AutoConfigureMockMvc
class AgentControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void echoesAgentMessageThroughApi() throws Exception {
        mockMvc.perform(post("/api/agent/echo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"hello\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agent", equalTo("scaffold-agent")))
                .andExpect(jsonPath("$.reply", containsString("hello")));
    }
}

