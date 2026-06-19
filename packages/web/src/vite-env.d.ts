/// <reference types="vite/client" />

interface Window {
  /** Electron preload 注入的桌面壳配置；纯浏览器开发模式下可能不存在。 */
  airelia?: {
    /** 前端请求 Spring Boot 后端时使用的 API 基地址。 */
    apiUrl: string;
  };
}
