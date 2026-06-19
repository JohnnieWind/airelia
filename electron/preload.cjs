const { contextBridge } = require("electron");

// 只把前端需要的 API 基地址暴露到 window，避免开启完整 Node.js 能力。
contextBridge.exposeInMainWorld("airelia", {
  apiUrl: process.env.AIRELIA_API_URL ?? "http://localhost:8080"
});
