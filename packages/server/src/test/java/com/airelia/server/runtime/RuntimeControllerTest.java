package com.airelia.server.runtime;

import static org.hamcrest.Matchers.equalTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.airelia.server.AireliaServerApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = AireliaServerApplication.class)
@AutoConfigureMockMvc
class RuntimeControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void confirmsAgentScopeHarnessIsOnClasspath() throws Exception {
        mockMvc.perform(get("/api/runtime"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agentRuntime", equalTo("agentscope-harness")))
                .andExpect(jsonPath("$.agentScopeHarnessAvailable", equalTo(true)))
                .andExpect(jsonPath("$.harnessProbeClass", equalTo("io.agentscope.harness.agent.HarnessAgent")));
    }
}

