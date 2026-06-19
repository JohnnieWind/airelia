package com.airelia.server.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = AireliaServerApplication.class)
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class HealthControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsHealthStatus(CapturedOutput output) throws Exception {
        // 健康检查至少要返回 ok 状态和稳定的服务名，供前端状态卡片展示。
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", equalTo("ok")))
                .andExpect(jsonPath("$.service", equalTo("airelia-server")));

        assertThat(output).contains("Handling GET /api/health");
    }
}
